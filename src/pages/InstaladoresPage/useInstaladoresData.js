import { useMemo } from 'react'
import { INSTALLER_CATEGORIAS } from '../../constants/installers'
import { filterInstaladores } from '../../utils/installerFilter'

// Agregação da tela de Instaladores (abas de categoria com contagem e lista
// filtrada/ordenada), separada da renderização — equivalente a
// renderInstaladorCatTabs()/filteredInstaladores() do sistema original.
export function useInstaladoresData(installers, filters) {
  return useMemo(() => {
    const categoriaTabs = ['Todos', ...INSTALLER_CATEGORIAS].map((c) => ({
      value: c,
      label: c,
      count: c === 'Todos' ? installers.length : installers.filter((i) => i.categoria === c).length,
    }))

    const rows = filterInstaladores(installers, filters)

    return { categoriaTabs, rows }
  }, [installers, filters])
}
