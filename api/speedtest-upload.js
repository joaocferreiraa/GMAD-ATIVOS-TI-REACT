// Vercel Serverless Function — recebe o payload enviado pelo navegador e
// conta os bytes de verdade, pro teste de upload medir throughput real em
// vez de simular um número. O cliente manda em pedaços de ~1MB (ver
// src/utils/speedTest.js) pra não esbarrar no limite de tamanho de
// requisição da plataforma.
export default async function handler(req, res) {
  let bytes = 0
  await new Promise((resolve, reject) => {
    req.on('data', (chunk) => {
      bytes += chunk.length
    })
    req.on('end', resolve)
    req.on('error', reject)
  })
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ok: true, bytesReceived: bytes })
}
