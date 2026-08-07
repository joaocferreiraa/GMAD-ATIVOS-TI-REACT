// Repetido em assetsFilter/contatosFilter/installerFilter/scriptFilter/
// stockFilter: busca por texto testando se algum campo do registro contém a
// query (case-insensitive). `query` é normalizada uma única vez, fora do
// laço de filtragem — igual ao `const q = filters.search.toLowerCase()`
// original em cada arquivo.
export function createSearchMatcher(query) {
  const q = query.toLowerCase()
  return (fields) => fields.some((v) => v && String(v).toLowerCase().includes(q))
}
