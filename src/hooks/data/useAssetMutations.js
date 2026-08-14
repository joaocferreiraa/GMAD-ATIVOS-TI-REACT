import { createCrudMutations } from './createCrudMutations'
import { getAssetsWithMeta, saveAssets } from '../../services/ativos/assetsService'
import { queryKeys } from '../../constants/queryKeys'

const useCrud = createCrudMutations({
  queryKey: queryKeys.ativos,
  getFreshFn: getAssetsWithMeta,
  saveFn: saveAssets,
  uidParam: 'assetUid',
  withAudit: true,
  // O ID (hostname/tag) é usado em busca, tabela, CSV e relatórios — dois
  // ativos com o mesmo ID (ex: duas pessoas cadastrando quase ao mesmo
  // tempo, cada uma vendo a lista de antes da outra salvar) confundiria
  // qual é qual em todos esses lugares.
  uniqueField: 'id',
  duplicateMessage: (id) => `Já existe um ativo com o ID "${id}". Escolha outro identificador.`,
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
