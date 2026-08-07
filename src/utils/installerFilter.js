import { createSearchMatcher } from './textFilter'

// Verifica se a última atualização de um instalador está dentro dos
// últimos 30 dias (equivalente a installerRecent() original) — usado para
// exibir o badge "Recente".
export function installerRecent(iso) {
  if (!iso) return false
  const days = Math.round((Date.now() - new Date(`${iso}T00:00:00`).getTime()) / 86400000)
  return days >= 0 && days <= 30
}

// Lista de instaladores filtrada e ordenada pela barra de filtros da tela
// de Instaladores (equivalente a filteredInstaladores() do sistema
// original). `filters`: { categoria, search, sort }.
export function filterInstaladores(installers, filters) {
  let list = installers.slice()
  if (filters.categoria !== 'Todos') list = list.filter((i) => i.categoria === filters.categoria)
  if (filters.search) {
    const matches = createSearchMatcher(filters.search)
    list = list.filter((i) => matches([i.nome, i.categoria, i.desenvolvedor]))
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
