// Agente local de monitoramento de rede — ver agent/README.md pra instalar
// e rodar. Roda DENTRO da rede da GMAD (não na Vercel), porque só de lá dá
// pra alcançar IPs privados (192.168.x.x, 10.x.x.x...). Faz ping de verdade
// (utilitário `ping` do próprio sistema operacional, via child_process) nos
// pontos cadastrados em Monitoramento de Rede e grava cada medição real no
// Supabase — nenhum número aqui é inventado; se o ping falhar, a medição
// grava `disponivel: false` e nada de latência/perda de pacotes.
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import { collectHostMetrics } from './hostMetrics.js'

// execFile (não exec): manda o binário `ping` rodar direto, sem passar por
// um shell. `host` vem do cadastro do painel (campo de texto livre, sem
// validação de formato) — com exec()/uma string de comando, alguém
// cadastrando um host tipo "127.0.0.1 & comando-malicioso" executaria esse
// comando na máquina do agente. Com execFile() + array de argumentos, o
// host vira SEMPRE um único argumento literal pro `ping`, nunca é
// interpretado por um shell — na pior hipótese o `ping` falha por não
// achar esse "host", tratado normalmente pelo catch abaixo.
const execFileAsync = promisify(execFile)

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const AGENT_EMAIL = process.env.AGENT_EMAIL
const AGENT_PASSWORD = process.env.AGENT_PASSWORD

const MONITORS_KEY = 'gmad_network_monitors'
const MONITORS_REFRESH_MS = 5 * 60 * 1000
const PING_COUNT = 4
// Métricas do host num intervalo próprio, bem mais espaçado que o ping:
// CPU/memória/disco mudam devagar e cada coleta é uma linha no banco, então
// 60s dá resolução de sobra sem inflar a tabela (1.440 linhas/dia).
// Configurável por HOST_METRICS_INTERVAL_SEGUNDOS; 0 desliga a coleta.
const HOST_METRICS_INTERVAL_MS =
  Math.max(parseInt(process.env.HOST_METRICS_INTERVAL_SEGUNDOS ?? '60', 10) || 0, 0) * 1000
const DEFAULT_THRESHOLDS = {
  latenciaMaximaMs: 100,
  packetLossMaximoPct: 2,
  falhasConsecutivasLimite: 3,
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !AGENT_EMAIL || !AGENT_PASSWORD) {
  console.error(
    '[agente] Faltam variáveis de ambiente. Copie .env.example para .env e preencha SUPABASE_URL, SUPABASE_ANON_KEY, AGENT_EMAIL e AGENT_PASSWORD.',
  )
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const consecutiveFailures = new Map() // monitorUid -> contagem de falhas seguidas
const timers = new Map() // monitorUid -> intervalId
const scheduledConfigs = new Map() // monitorUid -> JSON do monitor agendado (pra detectar edição)

async function login() {
  const { error } = await supabase.auth.signInWithPassword({
    email: AGENT_EMAIL,
    password: AGENT_PASSWORD,
  })
  if (error) throw new Error(`Falha ao autenticar o agente: ${error.message}`)
  console.log(`[agente] autenticado como ${AGENT_EMAIL}`)
}

// Lê a config dos pontos monitorados do MESMO kv_store usado pelo painel
// (ver src/services/monitoramento/monitoresService.js) — o agente não
// duplica cadastro, só consome o que foi criado na tela.
async function getMonitors() {
  const { data, error } = await supabase
    .from('kv_store')
    .select('value')
    .eq('key', MONITORS_KEY)
    .single()
  if (error) {
    console.error('[agente] falha ao ler pontos monitorados:', error.message)
    return []
  }
  return (data?.value || []).filter((m) => m.ativo !== false)
}

// `disponivel` depende só de packetLossPct (algum pacote voltou = host no
// ar) — NÃO exige que a latência tenha sido interpretada. Formato de saída
// do `ping` varia por idioma/versão do Windows; se o host respondeu mas o
// regex de latência não bateu com aquele texto específico, o certo é
// mostrar "latência indisponível" (latenciaMs: null) e ainda assim marcar
// como online — não "offline" por um problema de parsing nosso, não da rede.
// Jitter no sentido usado em rede (RFC 3550): média do MÓDULO da variação
// entre pacotes CONSECUTIVOS — não o desvio padrão. A diferença importa:
// a série 10,20,10,20 tem desvio padrão baixo mas jitter alto (a conexão
// oscila a cada pacote), e é a oscilação que derruba VoIP e vídeo. Jitter
// alto com latência média boa é o sinal clássico de link degradando, e
// aparece antes da média subir.
function calcJitter(amostras) {
  if (!amostras || amostras.length < 2) return null
  let soma = 0
  for (let i = 1; i < amostras.length; i++) soma += Math.abs(amostras[i] - amostras[i - 1])
  return Math.round((soma / (amostras.length - 1)) * 100) / 100
}

function parseWindowsPing(stdout) {
  const lossMatch = stdout.match(/\((\d+)%/i) // "(0% de perda)"/"(0% loss)" — só dígitos, imune a codepage
  const packetLossPct = lossMatch ? parseInt(lossMatch[1], 10) : 100
  // NÃO procura pela palavra "Média"/"Mínimo"/"Máximo": o ping.exe do
  // Windows imprime a saída na code page OEM do console (ex: CP850), não
  // UTF-8 — o "é" chega corrompido (`M�dia`) e qualquer regex que dependa
  // dessa palavra falha silenciosamente. Em vez disso, pega a ÚLTIMA
  // ocorrência de "= <?Nms" na saída — a seção de estatísticas sempre lista
  // Mínimo, Máximo e Média nessa ordem, então a última é sempre a média,
  // com ou sem os rótulos legíveis.
  const allMs = [...stdout.matchAll(/=\s*<?(\d+)\s*ms/gi)]
  const latenciaMs = allMs.length ? parseInt(allMs[allMs.length - 1][1], 10) : null

  // Tempos de cada resposta individual ("tempo=11ms" / "time=11ms"), que é
  // o que permite calcular jitter. `tempo(=|<)` casa nos dois idiomas e
  // também em "tempo<1ms" (resposta sub-milissegundo em rede local).
  const respostas = [...stdout.matchAll(/(?:tempo|time)[=<]\s*(\d+)\s*ms/gi)].map((m) =>
    parseInt(m[1], 10),
  )

  return {
    disponivel: packetLossPct < 100,
    latenciaMs,
    packetLossPct,
    jitterMs: calcJitter(respostas),
  }
}

function parseUnixPing(stdout) {
  const lossMatch = stdout.match(/([\d.]+)%\s*packet loss/i)
  const avgMatch = stdout.match(/=\s*[\d.]+\/([\d.]+)\//) // rtt min/avg/max/mdev
  const packetLossPct = lossMatch ? parseFloat(lossMatch[1]) : 100
  const latenciaMs = avgMatch ? Math.round(parseFloat(avgMatch[1])) : null

  // Tempos individuais ("time=11.4 ms") pra calcular jitter do mesmo jeito
  // que na versão Windows — o `mdev` que o ping do Linux já reporta é
  // desvio padrão, não jitter entre pacotes consecutivos.
  const respostas = [...stdout.matchAll(/time[=<]\s*([\d.]+)\s*ms/gi)].map((m) => parseFloat(m[1]))

  return {
    disponivel: packetLossPct < 100,
    latenciaMs,
    packetLossPct,
    jitterMs: calcJitter(respostas),
  }
}

// Ping real via utilitário do SO — nunca inventa um número: se o comando
// falhar ou a saída não puder ser interpretada, devolve indisponível.
async function pingHost(host) {
  const isWindows = os.platform() === 'win32'
  const args = isWindows ? ['-n', String(PING_COUNT), host] : ['-c', String(PING_COUNT), host]
  const parse = isWindows ? parseWindowsPing : parseUnixPing
  try {
    const { stdout } = await execFileAsync('ping', args, { timeout: 15000 })
    return parse(stdout)
  } catch (err) {
    // ping retorna código de saída != 0 quando há perda de pacotes — ainda
    // assim a saída (parcial) costuma vir em err.stdout, então tentamos
    // interpretar antes de desistir.
    const stdout = err.stdout || ''
    const parsed = stdout ? parse(stdout) : null
    return parsed && parsed.disponivel
      ? parsed
      : { disponivel: false, latenciaMs: null, packetLossPct: 100, jitterMs: null }
  }
}

async function insertMeasurement(monitorUid, result) {
  const { error } = await supabase.from('network_measurements').insert({
    monitor_uid: monitorUid,
    tipo_medicao: 'ping',
    origem: 'agente',
    disponivel: result.disponivel,
    latencia_ms: result.latenciaMs,
    jitter_ms: result.jitterMs ?? null,
    packet_loss_pct: result.packetLossPct,
  })
  if (error) console.error(`[agente] falha ao gravar medição de ${monitorUid}:`, error.message)
}

// Mesma regra de "sem duplicar alerta aberto" do painel (ver
// services/monitoramento/measurementsService.js) — reimplementada aqui de
// forma simples porque o agente não importa código do app React (projetos
// separados, sem acoplamento).
async function openAlertIfNew(monitorUid, tipo, severidade, mensagem, valorAtual, valorLimite) {
  const { data: existing } = await supabase
    .from('network_alerts')
    .select('id')
    .eq('monitor_uid', monitorUid)
    .eq('tipo', tipo)
    .eq('resolvido', false)
    .limit(1)
  if (existing && existing.length) return
  await supabase.from('network_alerts').insert({
    monitor_uid: monitorUid,
    tipo,
    severidade,
    mensagem,
    valor_atual: valorAtual,
    valor_limite: valorLimite,
  })
  console.log(`[agente] alerta aberto: ${mensagem}`)
}

async function resolveAlertsOfType(monitorUid, tipo) {
  await supabase
    .from('network_alerts')
    .update({ resolvido: true, resolved_at: new Date().toISOString() })
    .eq('monitor_uid', monitorUid)
    .eq('tipo', tipo)
    .eq('resolvido', false)
}

// Checagem completa de UM ponto: ping real -> grava medição -> avalia
// limites configurados (thresholds do próprio ponto, com fallback pros
// padrões) -> abre/resolve alertas de offline/latência/packet loss. A
// detecção de OSCILAÇÃO (variação entre medições) fica só no painel
// (utils/networkStatus.js), que já tem o histórico à mão pra calcular isso
// sem o agente precisar buscar de volta o que acabou de gravar.
async function checkMonitor(monitor) {
  const result = await pingHost(monitor.host)
  await insertMeasurement(monitor.uid, result)

  const t = { ...DEFAULT_THRESHOLDS, ...(monitor.thresholds || {}) }
  const fails = consecutiveFailures.get(monitor.uid) || 0

  if (!result.disponivel) {
    const nextFails = fails + 1
    consecutiveFailures.set(monitor.uid, nextFails)
    if (nextFails >= t.falhasConsecutivasLimite) {
      await openAlertIfNew(
        monitor.uid,
        'offline',
        'problema',
        `${monitor.nome} está sem resposta (${nextFails} falha(s) consecutiva(s)).`,
        null,
        null,
      )
    }
    console.log(`[agente] ${monitor.nome} (${monitor.host}): sem resposta`)
    return
  }

  // Resolve incondicionalmente (não só quando `fails` local bate o limite):
  // `consecutiveFailures` é um contador em memória, perdido a cada reinício
  // do agente — se um alerta de offline ficou aberto numa execução
  // anterior e o processo reiniciou, `fails` volta a 0 e a checagem antiga
  // nunca seria "grande o suficiente" pra resolver o alerta, mesmo com o
  // ponto respondendo normalmente agora. resolveAlertsOfType() já é
  // idempotente (não faz nada se não houver alerta aberto), então chamar
  // sempre que o ponto responde é seguro e correto.
  await resolveAlertsOfType(monitor.uid, 'offline')
  consecutiveFailures.set(monitor.uid, 0)

  // latenciaMs null = ping respondeu mas o parsing não conseguiu extrair a
  // latência daquela saída (formato/idioma inesperado) — não é "dentro do
  // limite" nem "fora do limite", é desconhecido, então não mexe no alerta
  // de latência existente (não abre nem resolve).
  if (result.latenciaMs !== null) {
    if (result.latenciaMs > t.latenciaMaximaMs) {
      await openAlertIfNew(
        monitor.uid,
        'latencia',
        'problema',
        `${monitor.nome} com latência de ${result.latenciaMs}ms (limite: ${t.latenciaMaximaMs}ms).`,
        result.latenciaMs,
        t.latenciaMaximaMs,
      )
    } else {
      await resolveAlertsOfType(monitor.uid, 'latencia')
    }
  }

  if (result.packetLossPct > t.packetLossMaximoPct) {
    await openAlertIfNew(
      monitor.uid,
      'packet_loss',
      'problema',
      `${monitor.nome} com ${result.packetLossPct}% de perda de pacotes (limite: ${t.packetLossMaximoPct}%).`,
      result.packetLossPct,
      t.packetLossMaximoPct,
    )
  } else {
    await resolveAlertsOfType(monitor.uid, 'packet_loss')
  }

  console.log(
    `[agente] ${monitor.nome} (${monitor.host}): ${result.latenciaMs}ms` +
      (result.jitterMs !== null ? `, jitter ${result.jitterMs}ms` : '') +
      `, ${result.packetLossPct}% perda`,
  )
}

function scheduleMonitor(monitor) {
  const intervalMs = Math.max(5, monitor.intervaloSegundos || 30) * 1000
  const run = () =>
    checkMonitor(monitor).catch((e) =>
      console.error(`[agente] erro em ${monitor.nome}:`, e.message),
    )
  run()
  timers.set(monitor.uid, setInterval(run, intervalMs))
  scheduledConfigs.set(monitor.uid, JSON.stringify(monitor))
}

// Reconsulta a config periodicamente pra acompanhar pontos cadastrados/
// editados/excluídos sem precisar reiniciar o agente. Pontos com host,
// intervalo ou thresholds alterados são reagendados (o `run` de
// scheduleMonitor fecha sobre o objeto `monitor` antigo, então só remover
// da lista de removidos não bastaria pra pegar a edição).
async function refreshMonitors() {
  const monitors = await getMonitors()
  const currentUids = new Set(monitors.map((m) => m.uid))

  for (const [uid, id] of timers) {
    if (!currentUids.has(uid)) {
      clearInterval(id)
      timers.delete(uid)
      scheduledConfigs.delete(uid)
      consecutiveFailures.delete(uid)
      console.log(`[agente] parou de monitorar ${uid} (removido ou desativado)`)
    }
  }

  for (const monitor of monitors) {
    const config = JSON.stringify(monitor)
    if (!timers.has(monitor.uid)) {
      console.log(
        `[agente] monitorando ${monitor.nome} (${monitor.host}) a cada ${monitor.intervaloSegundos || 30}s`,
      )
      scheduleMonitor(monitor)
    } else if (scheduledConfigs.get(monitor.uid) !== config) {
      clearInterval(timers.get(monitor.uid))
      console.log(`[agente] reagendando ${monitor.nome} (${monitor.host}): configuração alterada`)
      scheduleMonitor(monitor)
    }
  }
}

// Métricas da própria máquina (CPU/memória/disco/uptime) — ver
// hostMetrics.js. `cpuAnteriorRef` guarda o snapshot da coleta passada,
// porque uso de CPU só existe entre duas amostras.
let cpuAnterior = null

async function collectAndSaveHostMetrics() {
  const { metrics, cpuSnapshot } = await collectHostMetrics(cpuAnterior)
  cpuAnterior = cpuSnapshot

  const { error } = await supabase.from('host_metrics').insert({
    host: metrics.host,
    rotulo: metrics.rotulo,
    plataforma: metrics.plataforma,
    cpu_pct: metrics.cpuPct,
    cpu_nucleos: metrics.cpuNucleos,
    mem_total_bytes: metrics.memTotalBytes,
    mem_usada_bytes: metrics.memUsadaBytes,
    mem_pct: metrics.memPct,
    disco_total_bytes: metrics.discoTotalBytes,
    disco_livre_bytes: metrics.discoLivreBytes,
    disco_pct: metrics.discoPct,
    uptime_segundos: metrics.uptimeSegundos,
  })

  if (error) {
    // Tabela ausente (migration 0004 ainda não rodada) é o erro esperado
    // em quem atualizou o agente antes do banco: avisa uma vez com a
    // instrução, em vez de repetir o mesmo erro cru a cada minuto.
    if (!collectAndSaveHostMetrics.avisou) {
      collectAndSaveHostMetrics.avisou = true
      console.error(
        `[agente] falha ao gravar métricas do host: ${error.message}\n` +
          '         Se a tabela não existe, rode supabase/migrations/0006_host_metrics.sql no SQL Editor do Supabase.',
      )
    }
    return
  }
  collectAndSaveHostMetrics.avisou = false
  console.log(
    `[agente] host ${metrics.host}: CPU ${metrics.cpuPct ?? '—'}% | RAM ${metrics.memPct ?? '—'}% | disco ${metrics.discoPct ?? '—'}%`,
  )
}

async function main() {
  await login()
  await refreshMonitors()
  setInterval(refreshMonitors, MONITORS_REFRESH_MS)

  if (HOST_METRICS_INTERVAL_MS > 0) {
    // A primeira coleta sai com cpuPct null de propósito (não há intervalo
    // anterior pra comparar) — a partir da segunda o número é real.
    collectAndSaveHostMetrics().catch((e) =>
      console.error('[agente] erro ao coletar métricas do host:', e.message),
    )
    setInterval(
      () =>
        collectAndSaveHostMetrics().catch((e) =>
          console.error('[agente] erro ao coletar métricas do host:', e.message),
        ),
      HOST_METRICS_INTERVAL_MS,
    )
    console.log(
      `[agente] coletando métricas do host a cada ${HOST_METRICS_INTERVAL_MS / 1000}s (HOST_METRICS_INTERVAL_SEGUNDOS=0 desliga).`,
    )
  }

  console.log('[agente] rodando. Ctrl+C para parar.')
}

process.on('SIGINT', () => {
  console.log('\n[agente] encerrando...')
  for (const id of timers.values()) clearInterval(id)
  process.exit(0)
})

main().catch((e) => {
  console.error('[agente] erro fatal:', e.message)
  process.exit(1)
})
