// Vercel Serverless Function (Node.js runtime, detectada automaticamente
// por estar em /api). Endpoint minúsculo — só responde o mais rápido
// possível, pra medir round-trip real (latência/jitter) a partir do
// navegador. Ver src/utils/speedTest.js.
export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  res.status(200).json({ ok: true, ts: Date.now() })
}
