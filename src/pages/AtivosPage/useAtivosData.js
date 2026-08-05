import { useMemo } from 'react'
import { CATEGORIES, CAT_LABEL_PLURAL } from '../../constants/categories'
import { getDepartamentos, getUnidades, isMadvilleUnit, matchesUnitValue } from '../../utils/units'
import { unitDisplayName } from '../../utils/formatters'
import { filterAssets, getUsuarios } from '../../utils/assetsFilter'

const MADVILLE_ORDER = ['Madville (Loja)', 'Madville (CD)', 'Madville (Soluções)']

// Toda a lógica de agregação da tela de Ativos (abas de unidade/categoria com
// contagem, opções dos filtros, lista filtrada/ordenada), separada da
// renderização — equivalente a renderUnitTabs/renderCatTabs/renderDeptFilter/
// renderUsuarioFilter/filteredAssets do sistema original.
export function useAtivosData(assets, filters) {
  return useMemo(() => {
    const unidades = getUnidades(assets)
    const madvilleUnits = unidades
      .filter(isMadvilleUnit)
      .slice()
      .sort((a, b) => MADVILLE_ORDER.indexOf(a) - MADVILLE_ORDER.indexOf(b))
    const outrasUnits = unidades.filter((u) => !isMadvilleUnit(u))
    const countForUnit = (u) => assets.filter((a) => a.unidade === u).length

    const unitTabs = {
      todosCount: assets.length,
      madvilleGroupCount: assets.filter((a) => isMadvilleUnit(a.unidade)).length,
      madvilleUnits: madvilleUnits.map((u) => ({
        value: u,
        label: unitDisplayName(u),
        count: countForUnit(u),
      })),
      outrasUnits: outrasUnits.map((u) => ({
        value: u,
        label: unitDisplayName(u),
        count: countForUnit(u),
      })),
    }

    const scopedByUnit =
      filters.unidade === 'Todas'
        ? assets
        : assets.filter((a) => matchesUnitValue(a.unidade, filters.unidade))

    const categoryTabs = ['Todos', ...CATEGORIES].map((c) => ({
      value: c,
      label: c === 'Todos' ? 'Todos' : CAT_LABEL_PLURAL[c],
      count:
        c === 'Todos' ? scopedByUnit.length : scopedByUnit.filter((a) => a.categoria === c).length,
    }))

    const scopedByCategoria =
      filters.categoria === 'Todos'
        ? scopedByUnit
        : scopedByUnit.filter((a) => a.categoria === filters.categoria)
    const departamentos = getDepartamentos(scopedByCategoria)
    const usuarios = getUsuarios(scopedByCategoria)

    const rows = filterAssets(assets, filters)

    return { unitTabs, categoryTabs, departamentos, usuarios, rows }
  }, [assets, filters])
}
