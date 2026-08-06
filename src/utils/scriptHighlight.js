import { SCRIPT_COMMENT_PREFIX, SCRIPT_KEYWORDS } from '../constants/scripts'

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}

// Highlighter leve e específico do projeto (sem depender de biblioteca
// externa) — porta 1:1 de highlightScriptCode() do sistema original: marca
// linhas de comentário e destaca strings/palavras-chave mais comuns por
// tipo de arquivo. Retorna HTML já escapado, pronto para
// dangerouslySetInnerHTML (mesmo uso de innerHTML do original).
export function highlightScriptCode(code, tipo) {
  const commentPrefixes = SCRIPT_COMMENT_PREFIX[tipo] || []
  const keywords = SCRIPT_KEYWORDS[tipo] || []
  const lines = (code || '').split('\n')
  return lines
    .map((line) => {
      const trimmed = line.trimStart()
      const isComment = commentPrefixes.some((p) =>
        trimmed.toUpperCase().startsWith(p.toUpperCase()),
      )
      if (isComment) return `<span class="tok-comment">${escapeHtml(line)}</span>`
      let html = escapeHtml(line)
      html = html.replace(/(&quot;[^&]*?&quot;)/g, '<span class="tok-string">$1</span>')
      keywords.forEach((kw) => {
        const re = new RegExp(`\\b(${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b`, 'gi')
        html = html.replace(re, '<span class="tok-keyword">$1</span>')
      })
      return html
    })
    .join('\n')
}
