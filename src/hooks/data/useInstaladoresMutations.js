import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveInstaladores } from '../../services/instaladores/installersService'
import { pushLog } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'
import { uid } from '../../utils/id'

// CRUD de instaladores sobre o kv_store, no mesmo padrão de
// useStockMutations: atualiza a lista em cache otimisticamente, registra no
// log de atividade, avisa por toast, e só então tenta persistir.
export function useInstaladoresMutations() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const autor = user?.email ? nameFromEmail(user.email) : undefined

  function applyLocally(next) {
    queryClient.setQueryData(queryKeys.instaladores, next)
  }

  async function persist(next) {
    try {
      await saveInstaladores(next)
    } catch {
      showToast('Falha ao salvar. Verifique sua conexão com o Supabase.', 'danger')
    }
  }

  const createInstalador = useMutation({
    mutationFn: async (record) => {
      const list = queryClient.getQueryData(queryKeys.instaladores) || []
      const newRecord = {
        ...record,
        uid: uid(),
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: autor,
      }
      const next = [...list, newRecord]
      applyLocally(next)
      await pushLog(`Cadastrou o instalador ${record.nome} (${record.categoria})`, autor)
      showToast('Instalador cadastrado com sucesso.')
      await persist(next)
      return newRecord
    },
  })

  const updateInstalador = useMutation({
    mutationFn: async ({ instaladorUid, record }) => {
      const list = queryClient.getQueryData(queryKeys.instaladores) || []
      const patch = { ...record, atualizadoEm: new Date().toISOString(), atualizadoPor: autor }
      const next = list.map((i) => (i.uid === instaladorUid ? { ...i, ...patch } : i))
      applyLocally(next)
      await pushLog(`Editou o instalador ${record.nome} (${record.categoria})`, autor)
      showToast('Instalador atualizado com sucesso.')
      await persist(next)
      return next.find((i) => i.uid === instaladorUid)
    },
  })

  const deleteInstalador = useMutation({
    mutationFn: async (item) => {
      const list = queryClient.getQueryData(queryKeys.instaladores) || []
      const next = list.filter((i) => i.uid !== item.uid)
      applyLocally(next)
      await pushLog(`Excluiu o instalador ${item.nome}`, autor)
      showToast('Instalador excluído.', 'danger')
      await persist(next)
    },
  })

  return { createInstalador, updateInstalador, deleteInstalador }
}
