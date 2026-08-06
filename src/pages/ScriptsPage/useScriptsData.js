import { useMemo } from 'react'
import { SCRIPT_CATEGORIAS } from '../../constants/scripts'
import { filterScripts } from '../../utils/scriptFilter'

// Agregação da tela de Scripts (abas de categoria com contagem e lista
// filtrada/ordenada), separada da renderização — equivalente a
// renderScriptCatTabs()/filteredScripts() do sistema original.
export function useScriptsData(scripts, filters) {
  return useMemo(() => {
    const categoriaTabs = ['Todos', ...SCRIPT_CATEGORIAS].map((c) => ({
      value: c,
      label: c,
      count: c === 'Todos' ? scripts.length : scripts.filter((s) => s.categoria === c).length,
    }))

    const rows = filterScripts(scripts, filters)

    return { categoriaTabs, rows }
  }, [scripts, filters])
}
