import { SCRIPT_COMMENT_PREFIX, SCRIPT_KEYWORDS } from '../constants/scripts'

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c])
}

// Aplica a substituição só nos trechos de TEXTO, pulando as tags que o
// próprio highlighter já inseriu. Como escapeHtml() roda antes e não deixa
// passar nenhum '<' vindo do código, todo <...> presente aqui é marcação
// nossa — então dividir por tags é seguro e sem ambiguidade.
//
// Sem isso uma palavra-chave casava DENTRO da marcação: num .REG a palavra
// 'string' (que está na lista de palavras-chave do tipo) casava com o
// class="tok-string" recém-inserido pela etapa de strings e produzia
// class="tok-<span class="tok-keyword">string</span>", quebrando o bloco.
// Como praticamente todo .REG tem valores entre aspas, isso valia pra quase
// todos eles.
function replaceOutsideTags(html, re, replacement) {
  return html
    .split(/(<[^>]*>)/g)
    .map((part) => (part.startsWith('<') ? part : part.replace(re, replacement)))
    .join('')
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
        html = replaceOutsideTags(html, re, '<span class="tok-keyword">$1</span>')
      })
      return html
    })
    .join('\n')
}
