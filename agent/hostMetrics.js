// Coleta de métricas da MÁQUINA onde o agente roda (CPU, memória, disco,
// uptime) — alimenta a aba "Painel de Infraestrutura" do painel. Separado
// do index.js porque é outra pergunta: o resto do agente mede a CONEXÃO até
// pontos da rede (ping); isto mede a saúde do próprio servidor.
//
// Sem dependências novas: `os` é nativo do Node e o disco sai de um
// comando do próprio SO (mesma abordagem do ping — ver index.js).
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// Snapshot dos contadores de tempo de CPU de cada núcleo. O SO expõe
// TOTAIS ACUMULADOS desde o boot, não uma porcentagem instantânea — então
// "uso de CPU" só existe entre DUAS amostras (ver cpuPercentBetween).
export function cpuSnapshot() {
  return os.cpus().map((c) => ({
    idle: c.times.idle,
    total: Object.values(c.times).reduce((a, b) => a + b, 0),
  }))
}

// Uso de CPU (%) entre dois snapshots, somando todos os núcleos.
// Devolve null (não 0, não 100) quando não dá pra calcular — sem tempo
// decorrido entre as amostras, ou contagem de núcleos diferente. Mesma
// regra do resto do agente: nunca reportar um número que não foi medido.
export function cpuPercentBetween(anterior, atual) {
  if (!anterior || !atual || anterior.length !== atual.length) return null
  let idleDelta = 0
  let totalDelta = 0
  for (let i = 0; i < anterior.length; i++) {
    idleDelta += atual[i].idle - anterior[i].idle
    totalDelta += atual[i].total - anterior[i].total
  }
  if (totalDelta <= 0) return null
  return Math.round((1 - idleDelta / totalDelta) * 10000) / 100
}

// Espaço em disco somando os volumes fixos da máquina. Windows via
// PowerShell/CIM, Unix via `df`. Qualquer falha devolve nulls — o painel
// mostra "sem medição" em vez de um número inventado.
async function readDisk() {
  const vazio = { discoTotalBytes: null, discoLivreBytes: null, discoPct: null }
  try {
    if (os.platform() === 'win32') {
      // DriveType=3 = disco fixo local (exclui rede, CD, removível), pra
      // não contar um pendrive plugado como se fosse disco do servidor.
      const { stdout } = await execFileAsync(
        'powershell',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object Size,FreeSpace | ConvertTo-Json -Compress",
        ],
        { timeout: 20000 },
      )
      const parsed = JSON.parse(stdout)
      // ConvertTo-Json devolve objeto (não array) quando há só um disco.
      const discos = Array.isArray(parsed) ? parsed : [parsed]
      const total = discos.reduce((s, d) => s + Number(d?.Size || 0), 0)
      const livre = discos.reduce((s, d) => s + Number(d?.FreeSpace || 0), 0)
      if (!total) return vazio
      return {
        discoTotalBytes: total,
        discoLivreBytes: livre,
        discoPct: Math.round((1 - livre / total) * 10000) / 100,
      }
    }

    // Unix: -P força o formato POSIX de uma linha por sistema de arquivos
    // (sem quebra quando o nome do dispositivo é longo); -k padroniza a
    // unidade em KiB, então não dependemos do formato "human readable".
    const { stdout } = await execFileAsync('df', ['-Pk', '/'], { timeout: 15000 })
    const linha = stdout.trim().split('\n')[1]
    if (!linha) return vazio
    const cols = linha.split(/\s+/)
    const total = Number(cols[1]) * 1024
    const livre = Number(cols[3]) * 1024
    if (!total) return vazio
    return {
      discoTotalBytes: total,
      discoLivreBytes: livre,
      discoPct: Math.round((1 - livre / total) * 10000) / 100,
    }
  } catch {
    return vazio
  }
}

// Leitura completa das métricas do host. `cpuAnterior` é o snapshot da
// coleta passada — na primeira execução vem null e `cpuPct` sai null (não
// há intervalo pra medir), o que é correto: melhor um buraco no gráfico do
// que um número chutado.
export async function collectHostMetrics(cpuAnterior) {
  const snapshotAtual = cpuSnapshot()
  const memTotal = os.totalmem()
  const memLivre = os.freemem()
  const memUsada = memTotal - memLivre
  const disco = await readDisk()

  return {
    metrics: {
      host: os.hostname(),
      rotulo: process.env.AGENT_HOST_LABEL || null,
      plataforma: os.platform(),
      cpuPct: cpuPercentBetween(cpuAnterior, snapshotAtual),
      cpuNucleos: os.cpus().length,
      memTotalBytes: memTotal,
      memUsadaBytes: memUsada,
      memPct: memTotal ? Math.round((memUsada / memTotal) * 10000) / 100 : null,
      ...disco,
      uptimeSegundos: Math.round(os.uptime()),
    },
    cpuSnapshot: snapshotAtual,
  }
}
