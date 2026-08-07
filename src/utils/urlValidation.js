// Guarda contra URLs de protocolo perigoso (ex: `javascript:`, `data:`) sendo
// salvas em campos de link de download (Instaladores/Scripts) e depois
// renderizadas como `href` — só http(s) é aceito como link de download real.
export function isHttpUrl(value) {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}
