import { useMutation, useQueryClient } from '@tanstack/react-query'
import { pushLog } from '../../services/activityLog/activityLogService'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'
import { uid } from '../../utils/id'
import { KvConflictError } from '../../services/supabase/kvStore'

// Factory para o padrão de CRUD sobre o kv_store repetido em
// useAssetMutations/useContatoMutations/useInstaladoresMutations/useStockMutations:
// cada mutação busca o valor mais recente do banco (não o do cache local,
// que pode estar desatualizado — evita que duas sessões concorrentes
// sobrescrevam uma a outra sem perceber), aplica a mudança no cache
// (otimista), registra no log de atividade, avisa por toast, e só então
// tenta persistir de forma condicional (compare-and-swap via
// `expectedUpdatedAt` — ver kvSet). Se outra sessão gravou por baixo nesse
// meio-tempo, a mudança local é descartada, os dados reais são recarregados
// e o usuário é avisado do conflito em vez de perder a edição em silêncio.
export function createCrudMutations({
  queryKey,
  getFreshFn,
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

    async function persist(next, expectedUpdatedAt) {
      try {
        await saveFn(next, expectedUpdatedAt)
      } catch (e) {
        if (e instanceof KvConflictError) {
          const { value: latest } = await getFreshFn()
          applyLocally(latest)
          showToast(
            'Alguém alterou esses dados enquanto você editava — a tela foi atualizada com a versão mais recente. Confira e repita a ação se necessário.',
            'danger',
          )
          return
        }
        showToast('Falha ao salvar. Verifique sua conexão com o Supabase.', 'danger')
      }
    }

    const create = useMutation({
      mutationFn: async (record) => {
        const { value: list, updatedAt } = await getFreshFn()
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
        await persist(next, updatedAt)
        return newRecord
      },
    })

    const update = useMutation({
      mutationFn: async (payload) => {
        const targetUid = payload[uidParam]
        const { record } = payload
        const { value: list, updatedAt } = await getFreshFn()
        const patch = withAudit
          ? { ...record, atualizadoEm: new Date().toISOString(), atualizadoPor: autor }
          : { ...record }
        const next = list.map((item) => (item.uid === targetUid ? { ...item, ...patch } : item))
        applyLocally(next)
        await pushLog(updateLogMessage(record), autor)
        showToast(updateSuccessMessage)
        await persist(next, updatedAt)
        return next.find((item) => item.uid === targetUid)
      },
    })

    const remove = useMutation({
      mutationFn: async (item) => {
        const { value: list, updatedAt } = await getFreshFn()
        const next = list.filter((i) => i.uid !== item.uid)
        applyLocally(next)
        await pushLog(deleteLogMessage(item), autor)
        showToast(deleteSuccessMessage, 'danger')
        await persist(next, updatedAt)
      },
    })

    // Mutações extras específicas de um domínio (ex: favoritar/registrar
    // download em Scripts) que não fazem parte do padrão CRUD comum — mesmas
    // `applyLocally`/`persist`/`getFreshFn`, sem log de atividade nem toast.
    const extra = useExtraMutations({ queryClient, queryKey, applyLocally, persist, getFreshFn })

    return { create, update, remove, ...extra }
  }
}
