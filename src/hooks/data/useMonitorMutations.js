import { createCrudMutations } from './createCrudMutations'
import { getMonitoresWithMeta, saveMonitores } from '../../services/monitoramento/monitoresService'
import { queryKeys } from '../../constants/queryKeys'

const useCrud = createCrudMutations({
  queryKey: queryKeys.monitores,
  getFreshFn: getMonitoresWithMeta,
  saveFn: saveMonitores,
  uidParam: 'monitorUid',
  withAudit: true,
  getRotulo: (ponto) => ponto?.nome,
  createLogMessage: (record) => `Cadastrou o ponto monitorado ${record.nome} (${record.tipo})`,
  updateLogMessage: (record) => `Editou o ponto monitorado ${record.nome} (${record.tipo})`,
  deleteLogMessage: (item) => `Excluiu o ponto monitorado ${item.nome} (${item.tipo})`,
  createSuccessMessage: 'Ponto monitorado cadastrado com sucesso.',
  updateSuccessMessage: 'Ponto monitorado atualizado com sucesso.',
  deleteSuccessMessage: 'Ponto monitorado excluído.',
})

// CRUD dos pontos monitorados (config) sobre o kv_store — ver
// createCrudMutations para o comportamento comum (otimista, log de
// atividade, toast, persistência). As medições em si NÃO passam por aqui —
// ver useMedicoes.js / measurementsService.js.
export function useMonitorMutations() {
  const { create, update, remove } = useCrud()
  return { createMonitor: create, updateMonitor: update, deleteMonitor: remove }
}
