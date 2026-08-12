import { createCrudMutations } from './createCrudMutations'
import {
  getInstaladoresWithMeta,
  saveInstaladores,
} from '../../services/instaladores/installersService'
import { queryKeys } from '../../constants/queryKeys'

const useCrud = createCrudMutations({
  queryKey: queryKeys.instaladores,
  getFreshFn: getInstaladoresWithMeta,
  saveFn: saveInstaladores,
  uidParam: 'instaladorUid',
  withAudit: true,
  createLogMessage: (record) => `Cadastrou o instalador ${record.nome} (${record.categoria})`,
  updateLogMessage: (record) => `Editou o instalador ${record.nome} (${record.categoria})`,
  deleteLogMessage: (item) => `Excluiu o instalador ${item.nome}`,
  createSuccessMessage: 'Instalador cadastrado com sucesso.',
  updateSuccessMessage: 'Instalador atualizado com sucesso.',
  deleteSuccessMessage: 'Instalador excluído.',
})

// CRUD de instaladores sobre o kv_store — ver createCrudMutations para o
// comportamento comum (otimista, log de atividade, toast, persistência).
export function useInstaladoresMutations() {
  const { create, update, remove } = useCrud()
  return { createInstalador: create, updateInstalador: update, deleteInstalador: remove }
}
