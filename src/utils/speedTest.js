// Teste de velocidade REAL executado no navegador — mede de verdade contra
// os endpoints /api/speedtest-* (Vercel Serverless Functions em api/, na
// raiz do projeto). Nenhum número aqui é inventado: se uma etapa falhar
// (endpoint indisponível, rede caiu no meio do teste...), o resultado
// daquela etapa vem `null` e a UI mostra "Medição indisponível" em vez de
// um valor fictício.
//
// IMPORTANTE sobre o que isso mede: é a velocidade entre o navegador de
// quem está rodando o teste e a borda (edge) da Vercel — não um servidor
// geograficamente distribuído como um speedtest.net "de verdade". Ainda
// assim é uma medição real (bytes de verdade, tempo de verdade), só que
// com esse escopo.
//
// SÓ FUNCIONA DE VERDADE NA VERCEL (produção) OU VIA `vercel dev`. Rodando
// só `npm run dev` (Vite puro) em localhost, a pasta api/ não é executada
// como função serverless — o Vite serve o ARQUIVO .js como código-fonte
// estático (200 OK, texto JavaScript) em vez de rodar o handler. Sem as
// validações abaixo (isRealPingResponse, checagem de content-type/corpo em
// measureDownload/measureUpload), isso geraria um número "de mentira"
// (tempo de baixar ~1KB de código-fonte, travestido de velocidade real) —
// por isso cada etapa confirma o formato da resposta antes de aceitar o
// resultado, e devolve indisponível em vez de mentir quando o ambiente não
// suporta o teste de verdade.

const PING_ENDPOINT = '/api/speedtest-ping'
const DOWNLOAD_ENDPOINT = '/api/speedtest-download'
const UPLOAD_ENDPOINT = '/api/speedtest-upload'

const PING_SAMPLES = 6
const DOWNLOAD_BYTES = 8_000_000 // 8 MB
const UPLOAD_CHUNK_BYTES = 1_000_000 // 1 MB por requisição — evita o limite de tamanho de request da plataforma
const UPLOAD_CHUNKS = 4 // 4 MB total

function round1(n) {
  return Math.round(n * 10) / 10
}

function bytesToMbps(bytes, seconds) {
  if (!seconds || seconds <= 0) return null
  return (bytes * 8) / seconds / 1_000_000
}

// Confere se a resposta é DE VERDADE o handler de api/speedtest-*.js
// respondendo, e não outra coisa por trás do mesmo caminho/URL. Isso
// importa porque `vite dev` (localhost, sem Vercel) não sabe executar
// funções serverless — ele serve o arquivo .js da pasta api/ como
// código-fonte estático (200 OK, texto JavaScript) em vez de rodá-lo. Sem
// essa checagem, o teste mediria o tempo de baixar ~1KB de código-fonte e
// reportaria isso como se fosse a medição real — exatamente o tipo de
// número inventado que não pode acontecer aqui. `res.ok` sozinho não
// distingue os dois casos (os dois retornam 200); só dá pra saber
// validando o formato do corpo da resposta.
async function isRealPingResponse(res) {
  try {
    const data = await res.json()
    return data?.ok === true
  } catch {
    return false
  }
}

// Mede latência (média) e jitter (variação entre as amostras) com várias
// idas-e-voltas curtas — mesmo princípio de qualquer speedtest de verdade,
// só que contra um endpoint nosso.
async function measureLatency() {
  const samples = []
  for (let i = 0; i < PING_SAMPLES; i++) {
    const start = performance.now()
    try {
      const res = await fetch(`${PING_ENDPOINT}?t=${Date.now()}`, { cache: 'no-store' })
      const elapsed = performance.now() - start
      if (res.ok && (await isRealPingResponse(res))) samples.push(elapsed)
    } catch {
      // amostra perdida — segue com as que deram certo
    }
  }
  if (!samples.length) return { latenciaMs: null, jitterMs: null, packetLossPct: 100 }
  const latenciaMs = samples.reduce((s, v) => s + v, 0) / samples.length
  const jitterMs =
    samples.length > 1
      ? samples.slice(1).reduce((s, v, i) => s + Math.abs(v - samples[i]), 0) / (samples.length - 1)
      : 0
  const packetLossPct = ((PING_SAMPLES - samples.length) / PING_SAMPLES) * 100
  return {
    latenciaMs: round1(latenciaMs),
    jitterMs: round1(jitterMs),
    packetLossPct: round1(packetLossPct),
  }
}

async function measureDownload() {
  const start = performance.now()
  try {
    const res = await fetch(`${DOWNLOAD_ENDPOINT}?bytes=${DOWNLOAD_BYTES}&t=${Date.now()}`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    // api/speedtest-download.js sempre responde application/octet-stream —
    // qualquer outro content-type (ex: text/javascript) significa que essa
    // rota não está rodando como função serverless de verdade (ver
    // isRealPingResponse acima), então o tamanho recebido não é
    // confiável pra virar uma medição.
    if (!(res.headers.get('content-type') || '').includes('application/octet-stream')) return null
    const blob = await res.blob()
    const seconds = (performance.now() - start) / 1000
    if (blob.size < DOWNLOAD_BYTES * 0.95) return null // resposta truncada/errada, não confiar
    return bytesToMbps(blob.size, seconds)
  } catch {
    return null
  }
}

async function measureUpload() {
  const payload = new Blob([new Uint8Array(UPLOAD_CHUNK_BYTES)])
  let totalBytes = 0
  const start = performance.now()
  try {
    for (let i = 0; i < UPLOAD_CHUNKS; i++) {
      const res = await fetch(`${UPLOAD_ENDPOINT}?t=${Date.now()}`, {
        method: 'POST',
        body: payload,
        cache: 'no-store',
      })
      if (!res.ok) break
      // api/speedtest-upload.js sempre confirma quantos bytes recebeu de
      // volta — se o corpo não bater com esse formato (ou os bytes
      // recebidos vierem muito abaixo do enviado), a rota não rodou como
      // função serverless de verdade (mesmo caso de measureDownload) e não
      // dá pra confiar no tempo medido.
      let data
      try {
        data = await res.json()
      } catch {
        break
      }
      if (typeof data?.bytesReceived !== 'number' || data.bytesReceived < UPLOAD_CHUNK_BYTES * 0.95) {
        break
      }
      totalBytes += UPLOAD_CHUNK_BYTES
    }
  } catch {
    // segue com o que já foi enviado com sucesso
  }
  if (!totalBytes) return null
  const seconds = (performance.now() - start) / 1000
  return bytesToMbps(totalBytes, seconds)
}

// Roda o teste completo, chamando `onStage(stage)` a cada etapa
// ('latencia' | 'download' | 'upload' | 'concluido') pra UI mostrar
// progresso. Retorna os campos já no formato aceito por
// measurementsService.insertMeasurement — qualquer etapa que falhar vem
// `null`, nunca com um valor inventado.
export async function runSpeedTest({ onStage } = {}) {
  onStage?.('latencia')
  const { latenciaMs, jitterMs, packetLossPct } = await measureLatency()

  onStage?.('download')
  const downloadMbpsRaw = await measureDownload()

  onStage?.('upload')
  const uploadMbpsRaw = await measureUpload()

  onStage?.('concluido')

  return {
    tipoMedicao: 'speedtest',
    origem: 'navegador',
    disponivel: latenciaMs !== null || downloadMbpsRaw !== null || uploadMbpsRaw !== null,
    latenciaMs,
    jitterMs,
    packetLossPct,
    downloadMbps: downloadMbpsRaw !== null ? round1(downloadMbpsRaw) : null,
    uploadMbps: uploadMbpsRaw !== null ? round1(uploadMbpsRaw) : null,
  }
}
