import { createSearchMatcher } from './textFilter'

// Lista de itens de estoque filtrada e ordenada pela barra de filtros da
// tela de Estoque (equivalente a filteredStock() no sistema original).
// `filters`: { tipo, status, search }. Ao contrário de Ativos/Contatos, a
// tabela de Estoque não tem colunas ordenáveis — a ordenação é sempre por
// `item` (mesmo comportamento do original).
export function filterStock(stock, filters) {
  let list = stock.slice()
  if (filters.tipo !== 'Todos') list = list.filter((i) => i.tipo === filters.tipo)
  if (filters.status) list = list.filter((i) => (i.status || 'Disponível') === filters.status)
  if (filters.search) {
    const matches = createSearchMatcher(filters.search)
    list = list.filter((i) => matches([i.item, i.marcaModelo, i.observacoes, i.unidade]))
  }
  return list.sort((a, b) => (a.item || '').localeCompare(b.item || '', 'pt-BR'))
}
