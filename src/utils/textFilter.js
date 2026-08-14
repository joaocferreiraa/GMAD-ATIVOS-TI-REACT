// Repetido em assetsFilter/contatosFilter/installerFilter/scriptFilter/
// stockFilter: busca por texto testando se algum campo do registro contém a
// query (case-insensitive). `query` é normalizada uma única vez, fora do
// laço de filtragem — igual ao `const q = filters.search.toLowerCase()`
// original em cada arquivo.
export function createSearchMatcher(query) {
  const q = query.toLowerCase()
  return (fields) => fields.some((v) => v && String(v).toLowerCase().includes(q))
}

const DIACRITICS_REGEX = new RegExp('[' + String.fromCharCode(0x300) + '-' + String.fromCharCode(0x36f) + ']', 'g')

// Remove duplicatas por texto ignorando maiúsculas/minúsculas, acentos e
// espaços nas pontas (ex: "TI" e "Ti", ou "Claudio" e "Cláudio", contam como
// o mesmo valor) — usado por listas de sugestão montadas a partir de mais de
// uma fonte (ver getDepartamentoOptions, getResponsavelOptions), onde o
// mesmo nome pode ter sido digitado de forma levemente diferente em cada
// cadastro. Mantém a grafia da primeira ocorrência encontrada.
export function dedupeCaseInsensitive(values) {
  const seen = new Map()
  values.forEach((v) => {
    const trimmed = (v || '').trim()
    const key = trimmed.toLowerCase().normalize('NFD').replace(DIACRITICS_REGEX, '')
    if (key && !seen.has(key)) seen.set(key, trimmed)
  })
  return Array.from(seen.values())
}
