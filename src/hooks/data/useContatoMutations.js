import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveContatos } from '../../services/contatos/contatosService'
import { pushLog } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'
import { uid } from '../../utils/id'

// CRUD de colaboradores sobre o kv_store, no mesmo padrão de useAssetMutations:
// atualiza a lista em cache otimisticamente, registra no log de atividade,
// avisa por toast, e só então tenta persistir.
export function useContatoMutations() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const autor = user?.email ? nameFromEmail(user.email) : undefined

  function applyLocally(nextContatos) {
    queryClient.setQueryData(queryKeys.contatos, nextContatos)
  }

  async function persist(nextContatos) {
    try {
      await saveContatos(nextContatos)
    } catch {
      showToast('Falha ao salvar. Verifique sua conexão com o Supabase.', 'danger')
    }
  }

  const createContato = useMutation({
    mutationFn: async (record) => {
      const contatos = queryClient.getQueryData(queryKeys.contatos) || []
      const newRecord = { ...record, uid: uid() }
      const next = [...contatos, newRecord]
      applyLocally(next)
      await pushLog(`Cadastrou o colaborador ${record.nome} (${record.departamento})`, autor)
      showToast('Colaborador cadastrado com sucesso.')
      await persist(next)
      return newRecord
    },
  })

  const updateContato = useMutation({
    mutationFn: async ({ contatoUid, record }) => {
      const contatos = queryClient.getQueryData(queryKeys.contatos) || []
      const next = contatos.map((c) => (c.uid === contatoUid ? { ...c, ...record } : c))
      applyLocally(next)
      await pushLog(`Editou o colaborador ${record.nome} (${record.departamento})`, autor)
      showToast('Colaborador atualizado com sucesso.')
      await persist(next)
      return next.find((c) => c.uid === contatoUid)
    },
  })

  const deleteContato = useMutation({
    mutationFn: async (contato) => {
      const contatos = queryClient.getQueryData(queryKeys.contatos) || []
      const next = contatos.filter((c) => c.uid !== contato.uid)
      applyLocally(next)
      await pushLog(`Excluiu o colaborador ${contato.nome}`, autor)
      showToast('Colaborador excluído.', 'danger')
      await persist(next)
    },
  })

  return { createContato, updateContato, deleteContato }
}
