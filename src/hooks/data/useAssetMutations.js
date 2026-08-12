import { createCrudMutations } from './createCrudMutations'
import { getAssetsWithMeta, saveAssets } from '../../services/ativos/assetsService'
import { queryKeys } from '../../constants/queryKeys'

const useCrud = createCrudMutations({
  queryKey: queryKeys.ativos,
  getFreshFn: getAssetsWithMeta,
  saveFn: saveAssets,
  uidParam: 'assetUid',
  withAudit: true,
  createLogMessage: (record) => `Cadastrou o ativo ${record.id} (${record.categoria})`,
  updateLogMessage: (record) => `Editou o ativo ${record.id} (${record.categoria})`,
  deleteLogMessage: (asset) => `Excluiu o ativo ${asset.id} (${asset.categoria})`,
  createSuccessMessage: 'Ativo cadastrado com sucesso.',
  updateSuccessMessage: 'Ativo atualizado com sucesso.',
  deleteSuccessMessage: 'Ativo excluído.',
})

// CRUD de ativos sobre o kv_store — ver createCrudMutations para o
// comportamento comum (otimista, log de atividade, toast, persistência).
export function useAssetMutations() {
  const { create, update, remove } = useCrud()
  return { createAsset: create, updateAsset: update, deleteAsset: remove }
}
