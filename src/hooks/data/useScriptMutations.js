import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveScripts } from '../../services/scripts/scriptsService'
import { pushLog } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'
import { uid } from '../../utils/id'

// CRUD de scripts sobre o kv_store, no mesmo padrão de useStockMutations:
// atualiza a lista em cache otimisticamente, registra no log de atividade,
// avisa por toast, e só então tenta persistir. `toggleFavorite`/
// `registerDownload` seguem o original: sem log de atividade e sem toast,
// só persistem a mudança.
export function useScriptMutations() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const autor = user?.email ? nameFromEmail(user.email) : undefined

  function applyLocally(next) {
    queryClient.setQueryData(queryKeys.scripts, next)
  }

  async function persist(next) {
    try {
      await saveScripts(next)
    } catch {
      showToast('Falha ao salvar. Verifique sua conexão com o Supabase.', 'danger')
    }
  }

  const createScript = useMutation({
    mutationFn: async (record) => {
      const list = queryClient.getQueryData(queryKeys.scripts) || []
      const newRecord = {
        ...record,
        uid: uid(),
        favorito: false,
        downloads: 0,
        atualizadoEm: new Date().toISOString(),
        atualizadoPor: autor,
      }
      const next = [...list, newRecord]
      applyLocally(next)
      await pushLog(`Cadastrou o script ${record.nome} (${record.categoria})`, autor)
      showToast('Script cadastrado com sucesso.')
      await persist(next)
      return newRecord
    },
  })

  const updateScript = useMutation({
    mutationFn: async ({ scriptUid, record }) => {
      const list = queryClient.getQueryData(queryKeys.scripts) || []
      const patch = { ...record, atualizadoEm: new Date().toISOString(), atualizadoPor: autor }
      const next = list.map((s) => (s.uid === scriptUid ? { ...s, ...patch } : s))
      applyLocally(next)
      await pushLog(`Editou o script ${record.nome} (${record.categoria})`, autor)
      showToast('Script atualizado com sucesso.')
      await persist(next)
      return next.find((s) => s.uid === scriptUid)
    },
  })

  const deleteScript = useMutation({
    mutationFn: async (item) => {
      const list = queryClient.getQueryData(queryKeys.scripts) || []
      const next = list.filter((s) => s.uid !== item.uid)
      applyLocally(next)
      await pushLog(`Excluiu o script ${item.nome}`, autor)
      showToast('Script excluído.', 'danger')
      await persist(next)
    },
  })

  const toggleFavorite = useMutation({
    mutationFn: async (scriptUid) => {
      const list = queryClient.getQueryData(queryKeys.scripts) || []
      const next = list.map((s) => (s.uid === scriptUid ? { ...s, favorito: !s.favorito } : s))
      applyLocally(next)
      await persist(next)
      return next.find((s) => s.uid === scriptUid)
    },
  })

  const registerDownload = useMutation({
    mutationFn: async (scriptUid) => {
      const list = queryClient.getQueryData(queryKeys.scripts) || []
      const next = list.map((s) =>
        s.uid === scriptUid ? { ...s, downloads: (s.downloads || 0) + 1 } : s,
      )
      applyLocally(next)
      await persist(next)
    },
  })

  return { createScript, updateScript, deleteScript, toggleFavorite, registerDownload }
}
