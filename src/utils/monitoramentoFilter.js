import { createSearchMatcher } from './textFilter'

// Lista de pontos monitorados filtrada e ordenada (mesmo padrão de
// stockFilter.js/assetsFilter.js). `filters`: { unidade, tipo, search }.
export function filterMonitores(monitores, filters) {
  let list = monitores.slice()
  if (filters.unidade && filters.unidade !== 'Todas') {
    list = list.filter((m) => m.unidade === filters.unidade)
  }
  if (filters.tipo && filters.tipo !== 'Todos') {
    list = list.filter((m) => m.tipo === filters.tipo)
  }
  if (filters.search) {
    const matches = createSearchMatcher(filters.search)
    list = list.filter((m) => matches([m.nome, m.host, m.descricao, m.unidade]))
  }
  return list.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
}
