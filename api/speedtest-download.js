// Vercel Serverless Function — envia N bytes reais (parâmetro `bytes`, com
// teto de segurança) pro navegador medir a velocidade de download de
// verdade (tempo real de transferência, não um número simulado). Ver
// src/utils/speedTest.js.
const DEFAULT_BYTES = 8_000_000
const MAX_BYTES = 25_000_000
const CHUNK_SIZE = 65536

export default function handler(req, res) {
  const requested = parseInt(req.query?.bytes, 10)
  const bytes = Number.isFinite(requested)
    ? Math.min(Math.max(requested, 100_000), MAX_BYTES)
    : DEFAULT_BYTES

  res.setHeader('Content-Type', 'application/octet-stream')
  res.setHeader('Content-Length', String(bytes))
  res.setHeader('Cache-Control', 'no-store')

  const chunk = Buffer.alloc(CHUNK_SIZE, 0)
  let sent = 0

  function writeNext() {
    if (sent >= bytes) {
      res.end()
      return
    }
    const remaining = bytes - sent
    const toSend = remaining < CHUNK_SIZE ? chunk.subarray(0, remaining) : chunk
    sent += toSend.length
    const canContinue = res.write(toSend)
    if (canContinue) writeNext()
    else res.once('drain', writeNext)
  }

  writeNext()
}
