import { useMemo } from 'react'
import { STOCK_TIPOS, STOCK_TIPO_PLURAL } from '../../constants/stock'
import { filterStock } from '../../utils/stockFilter'

// Agregação da tela de Estoque (abas de Tipo com contagem e lista filtrada/
// ordenada), separada da renderização — equivalente a renderStockTipoTabs()/
// filteredStock() do sistema original.
export function useEstoqueData(stock, filters) {
  return useMemo(() => {
    const tipoTabs = ['Todos', ...STOCK_TIPOS].map((t) => ({
      value: t,
      label: t === 'Todos' ? t : STOCK_TIPO_PLURAL[t] || t,
      count: t === 'Todos' ? stock.length : stock.filter((i) => i.tipo === t).length,
    }))

    const rows = filterStock(stock, filters)

    return { tipoTabs, rows }
  }, [stock, filters])
}
