// Descoberta de equipamentos de rede que NÃO rodam o agente: impressoras,
// switches, roteadores, câmeras, nobreaks.
//
// POR QUE ISSO EXISTE:
// o agente de inventário cobre Windows. Metade de um parque de escritório
// não é Windows — no cadastro deste projeto são 12 impressoras, e nenhuma
// aparece no inventário automático. Este módulo fecha esse buraco vendo o
// equipamento de fora, pela rede.
//
// POR QUE NÃO É SÓ SNMP (que seria o caminho óbvio):
// medido neste parque, das 5 impressoras cadastradas TODAS respondem ping
// e porta 9100, mas só UMA tem SNMP habilitado. Apostar em SNMP daria
// cobertura de 20%. Por isso a identificação combina sinais: portas
// abertas dizem o QUE é o equipamento (9100 = impressora, 161 = gerenciável
// por SNMP), e o SNMP, quando disponível, diz QUAL é (modelo, série,
// contador de páginas).
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import net from 'node:net'
import os from 'node:os'

const execFileAsync = promisify(execFile)

// Portas que identificam o tipo de equipamento. A lista é curta de
// propósito: cada porta custa uma tentativa de conexão por host, e o
// objetivo aqui é classificar, não fazer varredura de segurança.
const PORTAS = [
  { porta: 9100, rotulo: 'impressao-raw', indica: 'Impressora' },
  { porta: 631, rotulo: 'ipp', indica: 'Impressora' },
  { porta: 515, rotulo: 'lpd', indica: 'Impressora' },
  { porta: 161, rotulo: 'snmp', indica: null },
  { porta: 80, rotulo: 'http', indica: null },
  { porta: 443, rotulo: 'https', indica: null },
  { porta: 22, rotulo: 'ssh', indica: 'Equipamento de rede' },
  { porta: 23, rotulo: 'telnet', indica: 'Equipamento de rede' },
]

const TIMEOUT_PORTA_MS = 900
const TIMEOUT_PING_MS = 2000

// Testa uma porta TCP. Resolve true/false, nunca lança: um host que recusa
// conexão, filtra ou simplesmente não existe são todos "porta fechada"
// para o nosso propósito.
function testarPorta(host, porta, timeout = TIMEOUT_PORTA_MS) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let resolvido = false
    const terminar = (valor) => {
      if (resolvido) return
      resolvido = true
      socket.destroy()
      resolve(valor)
    }
    socket.setTimeout(timeout)
    socket.once('connect', () => terminar(true))
    socket.once('timeout', () => terminar(false))
    socket.once('error', () => terminar(false))
    socket.connect(porta, host)
  })
}

// Ping via utilitário do sistema, mesma abordagem (e mesmo motivo) do
// agente de rede em index.js: Node não faz ICMP sem privilégio elevado.
async function pingar(host) {
  const isWindows = os.platform() === 'win32'
  const args = isWindows
    ? ['-n', '1', '-w', String(TIMEOUT_PING_MS), host]
    : ['-c', '1', '-W', String(Math.ceil(TIMEOUT_PING_MS / 1000)), host]
  try {
    const { stdout } = await execFileAsync('ping', args, { timeout: TIMEOUT_PING_MS + 3000 })
    // Windows responde "Esgotado o tempo limite" com código de saída 0 em
    // alguns casos, então não basta não ter erro: procuramos evidência de
    // resposta (TTL aparece em qualquer idioma).
    return /TTL[=:]|ttl[=:]/i.test(stdout)
  } catch {
    return false
  }
}

// Nome do host via DNS reverso — quando existe, costuma ser o jeito mais
// rápido de reconhecer o equipamento ("HP4A2B1C" numa impressora HP).
async function resolverNome(host) {
  try {
    const dns = await import('node:dns/promises')
    const nomes = await dns.reverse(host)
    return nomes?.[0] ?? null
  } catch {
    return null
  }
}

// Consulta SNMP v1/v2c pelo utilitário do sistema, quando disponível.
// Implementar SNMP do zero em Node exigiria uma dependência nova (o
// protocolo é ASN.1/BER sobre UDP), e o agente é deliberadamente sem
// dependências além do supabase-js. Sem snmpwalk instalado, a descoberta
// continua funcionando pelos outros sinais — só não traz modelo e série.
async function consultarSnmp(host, comunidade = 'public') {
  // OIDs padrão do MIB-II, suportados por qualquer equipamento com SNMP:
  //   sysDescr   .1.3.6.1.2.1.1.1.0  descrição (modelo, firmware)
  //   sysName    .1.3.6.1.2.1.1.5.0  nome configurado
  //   sysLocation.1.3.6.1.2.1.1.6.0  local, quando alguém preencheu
  const oids = {
    descricao: '1.3.6.1.2.1.1.1.0',
    nome: '1.3.6.1.2.1.1.5.0',
    local: '1.3.6.1.2.1.1.6.0',
  }
  const resultado = {}
  for (const [campo, oid] of Object.entries(oids)) {
    try {
      const { stdout } = await execFileAsync(
        'snmpget',
        ['-v', '2c', '-c', comunidade, '-Ovq', '-t', '2', '-r', '1', host, oid],
        { timeout: 8000 },
      )
      const valor = stdout.trim().replace(/^"|"$/g, '')
      if (valor && !/no such object/i.test(valor)) resultado[campo] = valor
    } catch {
      // snmpget ausente ou host sem resposta: segue sem esse campo.
    }
  }
  return Object.keys(resultado).length ? resultado : null
}

// Marcas no HTML que identificam famílias de equipamento cuja página não
// tem <title> preenchido. Cada padrão veio de observar o aparelho real —
// não é heurística genérica, e por isso são poucos e específicos.
const ASSINATURAS_HTML = [
  { padrao: /jsBase\/lib\/|\/js\/dhwebsdk|WebPluginLoader/i, rotulo: 'Câmera/DVR (Intelbras/Dahua)' },
  { padrao: /hikvision|doc\/page\/login/i, rotulo: 'Câmera/DVR (Hikvision)' },
  { padrao: /unifi|ubnt/i, rotulo: 'Equipamento Ubiquiti' },
  { padrao: /mikrotik|webfig/i, rotulo: 'Equipamento MikroTik' },
]

// Lê o título e o cabeçalho de identificação da interface web do
// equipamento.
//
// POR QUE ISSO IMPORTA: medido neste parque, a maioria dos equipamentos
// não-Windows tem porta 80 aberta e SNMP fechado. Sem olhar o HTTP, todos
// eles caem em "Desconhecido" — e uma lista de 24 desconhecidos não ajuda
// ninguém. O título da página costuma dizer o modelo ("HP LaserJet",
// "NVR", "UniFi"), que é o suficiente para classificar.
//
// Requisição deliberadamente mínima: HEAD não serve (precisamos do corpo
// para o <title>), então é um GET com limite de bytes — a página inteira
// de um roteador pode ter megabytes de JS que não nos interessam.
async function lerIdentificacaoHttp(host, porta) {
  const protocolo = porta === 443 ? 'https' : 'http'
  try {
    const controlador = new AbortController()
    const timer = setTimeout(() => controlador.abort(), 3500)
    const resposta = await fetch(`${protocolo}://${host}:${porta}/`, {
      signal: controlador.signal,
      redirect: 'follow',
      // Equipamento de rede quase sempre tem certificado autoassinado; a
      // verificação é desligada só aqui, para leitura de título — não há
      // credencial nem dado sensível nesta requisição.
      // eslint-disable-next-line no-undef
      dispatcher: undefined,
    }).catch(() => null)
    clearTimeout(timer)
    if (!resposta) return null

    // Cabeçalho Server identifica muitos equipamentos sem nem ler o corpo.
    const servidor = resposta.headers.get('server')

    const leitor = resposta.body?.getReader()
    let html = ''
    if (leitor) {
      const decoder = new TextDecoder('utf-8', { fatal: false })
      // 32 KB bastam para o <title>, que fica no início do documento.
      while (html.length < 32768) {
        const { done, value } = await leitor.read()
        if (done) break
        html += decoder.decode(value, { stream: true })
      }
      leitor.cancel().catch(() => {})
    }
    const bruto = html.match(/<title[^>]*>([^<]{1,200})<\/title>/i)?.[1]
    // Títulos de equipamento vêm cheios de &nbsp; e do próprio IP como
    // preenchimento ("HP LaserJet M402dne&nbsp;&nbsp;172.25.251.24"). Sem
    // limpar, a tela mostra lixo e a comparação entre coletas nunca bate.
    const titulo = bruto
      ? bruto
          .replace(/&nbsp;|&#160;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&quot;/gi, '"')
          .replace(/\s+/g, ' ')
          // Remove o próprio IP, que vários equipamentos repetem no título
          // ("HP LaserJet M402dne 172.25.251.24") — informação redundante,
          // já que o IP é a chave da linha na tela.
          .split(host)
          .join('')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 120)
      : null
    // Impressão digital do corpo, para equipamento que serve uma página
    // com <title> vazio — comum em câmera e DVR, cuja interface monta o
    // título por JavaScript depois de carregar. Sem isto, dezenas de
    // aparelhos idênticos ficariam como "Painel web" sem identificação.
    const assinatura = ASSINATURAS_HTML.find((a) => a.padrao.test(html))?.rotulo ?? null

    if (!titulo && !servidor && !assinatura) return null
    return { titulo: titulo || null, servidor: servidor || null, assinatura }
  } catch {
    return null
  }
}

// Deduz o tipo do equipamento a partir dos sinais coletados. Ordem
// importa: portas de impressão são o indício mais específico, e a
// descrição SNMP ou o título da interface web (quando existem) sobrepõem
// qualquer palpite por porta.
function classificar({ portas, snmp, nomeDns, http }) {
  const texto =
    `${snmp?.descricao ?? ''} ${nomeDns ?? ''} ${http?.titulo ?? ''} ${http?.servidor ?? ''} ${http?.assinatura ?? ''}`.toLowerCase()

  if (
    /jetdirect|laserjet|officejet|deskjet|epson|brother|ricoh|kyocera|lexmark|xerox|samsung.*print|impressora|printer/.test(
      texto,
    )
  ) {
    return 'Impressora'
  }
  if (
    /switch|catalyst|cisco|ubiquiti|unifi|mikrotik|routeros|tp-link|d-link|aruba|fortigate|pfsense|openwrt|access point/.test(
      texto,
    )
  ) {
    return 'Equipamento de rede'
  }
  if (/camera|hikvision|dahua|intelbras|nvr|dvr|webcam|ipcam/.test(texto)) return 'Câmera'
  if (/ups|nobreak|apc|sms power/.test(texto)) return 'Nobreak'
  if (/synology|qnap|nas |truenas/.test(texto)) return 'Armazenamento'
  if (/vmware|esxi|proxmox|idrac|ilo |supermicro/.test(texto)) return 'Servidor'

  const abertas = new Set(portas.map((p) => p.porta))
  if (abertas.has(9100) || abertas.has(631) || abertas.has(515)) return 'Impressora'
  if (abertas.has(22) || abertas.has(23)) return 'Equipamento de rede'
  // Só interface web e nada mais: não dá para afirmar o que é, mas
  // "Desconhecido" some numa lista longa. Dizer que tem painel web indica
  // o próximo passo — abrir o endereço no navegador e ver.
  if (abertas.has(80) || abertas.has(443)) return 'Painel web'
  return 'Desconhecido'
}

// Sonda um IP: responde? que portas tem? o que o SNMP diz?
// Nunca lança — um host inalcançável é resultado válido, não erro.
export async function sondarHost(host, { comunidadeSnmp = 'public' } = {}) {
  const respondeuPing = await pingar(host)

  // Testa as portas em paralelo. Mesmo sem responder ping, seguimos: é
  // comum firewall de impressora bloquear ICMP e aceitar 9100 — desistir
  // no ping perderia justamente esses equipamentos.
  const resultados = await Promise.all(
    PORTAS.map(async (p) => ({ ...p, aberta: await testarPorta(host, p.porta) })),
  )
  const portas = resultados.filter((p) => p.aberta)

  // Sem nenhum sinal de vida, não há equipamento a reportar.
  if (!respondeuPing && !portas.length) {
    return { host, online: false }
  }

  const temSnmp = portas.some((p) => p.porta === 161)
  // Prefere HTTP a HTTPS para ler o título: equipamento de rede quase
  // sempre tem certificado autoassinado, que a porta 80 evita.
  const portaWeb = portas.find((p) => p.porta === 80)?.porta ?? portas.find((p) => p.porta === 443)?.porta

  const [snmp, nomeDns, http] = await Promise.all([
    temSnmp ? consultarSnmp(host, comunidadeSnmp) : Promise.resolve(null),
    resolverNome(host),
    portaWeb ? lerIdentificacaoHttp(host, portaWeb) : Promise.resolve(null),
  ])

  return {
    host,
    online: true,
    respondeuPing,
    portas: portas.map((p) => ({ porta: p.porta, servico: p.rotulo })),
    nomeDns,
    snmpDescricao: snmp?.descricao ?? null,
    snmpNome: snmp?.nome ?? null,
    snmpLocal: snmp?.local ?? null,
    httpTitulo: http?.titulo ?? null,
    httpServidor: http?.servidor ?? null,
    httpAssinatura: http?.assinatura ?? null,
    tipo: classificar({ portas, snmp, nomeDns, http }),
  }
}

// Sonda uma lista de IPs com concorrência limitada.
//
// O limite existe porque disparar centenas de sondagens simultâneas satura
// a tabela de conexões da máquina e, em rede com firewall, parece varredura
// hostil — o que pode acionar bloqueio. 12 em paralelo mantém a varredura
// rápida sem parecer ataque.
export async function sondarLista(hosts, { concorrencia = 12, comunidadeSnmp = 'public', aoProgredir } = {}) {
  const fila = [...new Set(hosts.filter(Boolean))]
  const encontrados = []
  let concluidos = 0

  async function trabalhador() {
    while (fila.length) {
      const host = fila.shift()
      const r = await sondarHost(host, { comunidadeSnmp })
      concluidos++
      if (r.online) encontrados.push(r)
      aoProgredir?.(concluidos, r)
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concorrencia, fila.length) }, () => trabalhador()),
  )
  return encontrados
}

// Expande "172.25.251.0/24" ou "172.25.251.1-254" numa lista de IPs.
// Suporta só IPv4 e recusa faixas grandes demais: /16 seriam 65 mil
// sondagens, o que levaria horas e não é o caso de uso (rede de
// escritório é /24).
export function expandirFaixa(faixa) {
  const texto = String(faixa ?? '').trim()

  const cidr = texto.match(/^(\d+\.\d+\.\d+)\.(\d+)\/(\d+)$/)
  if (cidr) {
    const prefixo = Number(cidr[3])
    if (prefixo < 22) throw new Error('Faixa grande demais. Use /22 ou menor (ex.: 172.25.251.0/24).')
    const base = cidr[1]
    const total = 2 ** (32 - prefixo)
    // Só cobre faixas alinhadas em /24 ou menores, que é o formato usado
    // em rede de escritório.
    if (prefixo >= 24) {
      const inicio = Number(cidr[2])
      return Array.from({ length: total - 2 }, (_, i) => `${base}.${inicio + i + 1}`)
    }
    throw new Error('Use faixas /24 (ex.: 172.25.251.0/24) ou o formato 172.25.251.1-254.')
  }

  const intervalo = texto.match(/^(\d+\.\d+\.\d+)\.(\d+)\s*-\s*(\d+)$/)
  if (intervalo) {
    const base = intervalo[1]
    const de = Number(intervalo[2])
    const ate = Number(intervalo[3])
    if (de > ate) throw new Error('Início da faixa maior que o fim.')
    if (ate - de > 1024) throw new Error('Faixa grande demais (máximo 1024 endereços).')
    return Array.from({ length: ate - de + 1 }, (_, i) => `${base}.${de + i}`)
  }

  if (/^\d+\.\d+\.\d+\.\d+$/.test(texto)) return [texto]

  throw new Error(`Faixa inválida: "${texto}". Use 172.25.251.0/24, 172.25.251.1-254 ou um IP.`)
}
