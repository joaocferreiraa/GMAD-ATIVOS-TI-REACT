import { createCrudMutations } from './createCrudMutations'
import { getStockWithMeta, saveStock } from '../../services/estoque/stockService'
import { queryKeys } from '../../constants/queryKeys'

const useCrud = createCrudMutations({
  queryKey: queryKeys.estoque,
  getFreshFn: getStockWithMeta,
  saveFn: saveStock,
  uidParam: 'stockUid',
  withAudit: true,
  createLogMessage: (record) => `Cadastrou o item de estoque ${record.item} (${record.tipo})`,
  updateLogMessage: (record) => `Editou o item de estoque ${record.item} (${record.tipo})`,
  deleteLogMessage: (item) => `Excluiu o item de estoque ${item.item} (${item.tipo})`,
  createSuccessMessage: 'Item de estoque cadastrado com sucesso.',
  updateSuccessMessage: 'Item de estoque atualizado com sucesso.',
  deleteSuccessMessage: 'Item de estoque excluído.',
})

// CRUD de itens de estoque sobre o kv_store — ver createCrudMutations para
// o comportamento comum (otimista, log de atividade, toast, persistência).
export function useStockMutations() {
  const { create, update, remove } = useCrud()
  return { createStock: create, updateStock: update, deleteStock: remove }
}
