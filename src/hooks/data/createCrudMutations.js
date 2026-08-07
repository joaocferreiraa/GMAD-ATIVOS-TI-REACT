import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pushLog } from '../../services/activityLog/activityLogService'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'
import { uid } from '../../utils/id'

// Factory para o padrão de CRUD sobre o kv_store repetido em
// useAssetMutations/useContatoMutations/useInstaladoresMutations/useStockMutations:
// cada mutação atualiza a lista completa em cache (otimista, como o array
// mutado direto no sistema original), registra no log de atividade, avisa
// por toast, e só então tenta persistir — se a gravação falhar, mostra um
// segundo toast de erro mas não desfaz a mudança local, igual ao
// saveData() original.
export function createCrudMutations({
  queryKey,
  saveFn,
  uidParam,
  withAudit,
  createLogMessage,
  updateLogMessage,
  deleteLogMessage,
  createSuccessMessage,
  updateSuccessMessage,
  deleteSuccessMessage,
  extraCreateFields,
  useExtraMutations = () => null,
}) {
  return function useCrudMutations() {
    const queryClient = useQueryClient()
    const { showToast } = useToast()
    const { user } = useAuth()
    const autor = user?.email ? nameFromEmail(user.email) : undefined

    function applyLocally(next) {
      queryClient.setQueryData(queryKey, next)
    }

    async function persist(next) {
      try {
        await saveFn(next)
      } catch {
        showToast('Falha ao salvar. Verifique sua conexão com o Supabase.', 'danger')
      }
    }

    const create = useMutation({
      mutationFn: async (record) => {
        const list = queryClient.getQueryData(queryKey) || []
        const newRecord = {
          ...record,
          uid: uid(),
          ...extraCreateFields,
          ...(withAudit ? { atualizadoEm: new Date().toISOString(), atualizadoPor: autor } : null),
        }
        const next = [...list, newRecord]
        applyLocally(next)
        await pushLog(createLogMessage(record), autor)
        showToast(createSuccessMessage)
        await persist(next)
        return newRecord
      },
    })

    const update = useMutation({
      mutationFn: async (payload) => {
        const targetUid = payload[uidParam]
        const { record } = payload
        const list = queryClient.getQueryData(queryKey) || []
        const patch = withAudit
          ? { ...record, atualizadoEm: new Date().toISOString(), atualizadoPor: autor }
          : { ...record }
        const next = list.map((item) => (item.uid === targetUid ? { ...item, ...patch } : item))
        applyLocally(next)
        await pushLog(updateLogMessage(record), autor)
        showToast(updateSuccessMessage)
        await persist(next)
        return next.find((item) => item.uid === targetUid)
      },
    })

    const remove = useMutation({
      mutationFn: async (item) => {
        const list = queryClient.getQueryData(queryKey) || []
        const next = list.filter((i) => i.uid !== item.uid)
        applyLocally(next)
        await pushLog(deleteLogMessage(item), autor)
        showToast(deleteSuccessMessage, 'danger')
        await persist(next)
      },
    })

    // Mutações extras específicas de um domínio (ex: favoritar/registrar
    // download em Scripts) que não fazem parte do padrão CRUD comum — mesmas
    // `applyLocally`/`persist`, sem log de atividade nem toast.
    const extra = useExtraMutations({ queryClient, queryKey, applyLocally, persist })

    return { create, update, remove, ...extra }
  }
}
