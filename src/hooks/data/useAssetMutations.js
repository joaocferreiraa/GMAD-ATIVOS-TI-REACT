import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveAssets } from '../../services/ativos/assetsService'
import { pushLog } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'
import { uid } from '../../utils/id'

// CRUD de ativos sobre o kv_store: cada mutação atualiza a lista completa em
// cache, otimista (como o array `assets` mutado direto no sistema
// original), registra no log de atividade, avisa por toast, e só então tenta
// persistir — se a gravação falhar, mostra um segundo toast de erro mas não
// desfaz a mudança local, igual ao saveData() original.
export function useAssetMutations() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const autor = user?.email ? nameFromEmail(user.email) : undefined

  function applyLocally(nextAssets) {
    queryClient.setQueryData(queryKeys.ativos, nextAssets)
  }

  async function persist(nextAssets) {
    try {
      await saveAssets(nextAssets)
    } catch {
      showToast('Falha ao salvar. Verifique sua conexão com o Supabase.', 'danger')
    }
  }

  const createAsset = useMutation({
    mutationFn: async (record) => {
      const assets = queryClient.getQueryData(queryKeys.ativos) || []
      const newRecord = {
        ...record,
        uid: uid(),
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: autor,
      }
      const next = [...assets, newRecord]
      applyLocally(next)
      await pushLog(`Cadastrou o ativo ${record.id} (${record.categoria})`, autor)
      showToast('Ativo cadastrado com sucesso.')
      await persist(next)
      return newRecord
    },
  })

  const updateAsset = useMutation({
    mutationFn: async ({ assetUid, record }) => {
      const assets = queryClient.getQueryData(queryKeys.ativos) || []
      const patch = { ...record, atualizadoEm: new Date().toISOString(), atualizadoPor: autor }
      const next = assets.map((a) => (a.uid === assetUid ? { ...a, ...patch } : a))
      applyLocally(next)
      await pushLog(`Editou o ativo ${record.id} (${record.categoria})`, autor)
      showToast('Ativo atualizado com sucesso.')
      await persist(next)
      return next.find((a) => a.uid === assetUid)
    },
  })

  const deleteAsset = useMutation({
    mutationFn: async (asset) => {
      const assets = queryClient.getQueryData(queryKeys.ativos) || []
      const next = assets.filter((a) => a.uid !== asset.uid)
      applyLocally(next)
      await pushLog(`Excluiu o ativo ${asset.id} (${asset.categoria})`, autor)
      showToast('Ativo excluído.', 'danger')
      await persist(next)
    },
  })

  return { createAsset, updateAsset, deleteAsset }
}
