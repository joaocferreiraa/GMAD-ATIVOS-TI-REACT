import { useMemo } from 'react'
import { getUnidades } from '../../utils/units'
import {
  contatoDeptGestorMap,
  filterContatos,
  getContatoDepartamentos,
} from '../../utils/contatosFilter'

// Agregação da tela de Contatos (opções dos filtros e lista filtrada/
// ordenada), separada da renderização — equivalente a renderContatos()/
// filteredContatos() do sistema original. `unidades` é derivada dos Ativos
// (não dos próprios colaboradores), igual ao getUnidades() global original.
export function useContatosData(colaboradores, assets, filters) {
  return useMemo(() => {
    const unidades = getUnidades(assets)
    const departamentos = getContatoDepartamentos(colaboradores)
    const gestorMap = contatoDeptGestorMap(colaboradores)
    const rows = filterContatos(colaboradores, assets, filters)
    return { unidades, departamentos, gestorMap, rows }
  }, [colaboradores, assets, filters])
}
