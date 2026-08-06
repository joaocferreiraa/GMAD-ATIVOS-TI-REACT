import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveStock } from '../../services/estoque/stockService'
import { pushLog } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'
import { uid } from '../../utils/id'

// CRUD de itens de estoque sobre o kv_store, no mesmo padrão de
// useAssetMutations: atualiza a lista em cache otimisticamente, registra no
// log de atividade, avisa por toast, e só então tenta persistir.
export function useStockMutations() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const autor = user?.email ? nameFromEmail(user.email) : undefined

  function applyLocally(nextStock) {
    queryClient.setQueryData(queryKeys.estoque, nextStock)
  }

  async function persist(nextStock) {
    try {
      await saveStock(nextStock)
    } catch {
      showToast('Falha ao salvar. Verifique sua conexão com o Supabase.', 'danger')
    }
  }

  const createStock = useMutation({
    mutationFn: async (record) => {
      const stock = queryClient.getQueryData(queryKeys.estoque) || []
      const newRecord = {
        ...record,
        uid: uid(),
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: autor,
      }
      const next = [...stock, newRecord]
      applyLocally(next)
      await pushLog(`Cadastrou o item de estoque ${record.item} (${record.tipo})`, autor)
      showToast('Item de estoque cadastrado com sucesso.')
      await persist(next)
      return newRecord
    },
  })

  const updateStock = useMutation({
    mutationFn: async ({ stockUid, record }) => {
      const stock = queryClient.getQueryData(queryKeys.estoque) || []
      const patch = { ...record, atualizadoEm: new Date().toISOString(), atualizadoPor: autor }
      const next = stock.map((i) => (i.uid === stockUid ? { ...i, ...patch } : i))
      applyLocally(next)
      await pushLog(`Editou o item de estoque ${record.item} (${record.tipo})`, autor)
      showToast('Item de estoque atualizado com sucesso.')
      await persist(next)
      return next.find((i) => i.uid === stockUid)
    },
  })

  const deleteStock = useMutation({
    mutationFn: async (item) => {
      const stock = queryClient.getQueryData(queryKeys.estoque) || []
      const next = stock.filter((i) => i.uid !== item.uid)
      applyLocally(next)
      await pushLog(`Excluiu o item de estoque ${item.item} (${item.tipo})`, autor)
      showToast('Item de estoque excluído.', 'danger')
      await persist(next)
    },
  })

  return { createStock, updateStock, deleteStock }
}
