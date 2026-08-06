// Verifica se um script foi criado nos últimos 14 dias (equivalente a
// scriptNew() original) — usado para exibir o badge "Novo".
export function scriptNew(iso) {
  if (!iso) return false
  const days = Math.round((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86400000)
  return days >= 0 && days <= 14
}

// Lista de scripts filtrada e ordenada pela barra de filtros da tela de
// Scripts (equivalente a filteredScripts() do sistema original). `filters`:
// { categoria, search, sort, onlyFavorites }.
export function filterScripts(scripts, filters) {
  let list = scripts.slice()
  if (filters.categoria !== 'Todos') list = list.filter((s) => s.categoria === filters.categoria)
  if (filters.onlyFavorites) list = list.filter((s) => s.favorito)
  if (filters.search) {
    const q = filters.search.toLowerCase()
    list = list.filter((s) =>
      [s.nome, s.categoria, s.descricao, s.autor].some(
        (v) => v && String(v).toLowerCase().includes(q),
      ),
    )
  }
  if (filters.sort === 'data') {
    list.sort((a, b) => (b.dataAtualizacao || '').localeCompare(a.dataAtualizacao || ''))
  } else if (filters.sort === 'categoria') {
    list.sort(
      (a, b) =>
        (a.categoria || '').localeCompare(b.categoria || '', 'pt-BR') ||
        (a.nome || '').localeCompare(b.nome || '', 'pt-BR'),
    )
  } else {
    list.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
  }
  return list
}
