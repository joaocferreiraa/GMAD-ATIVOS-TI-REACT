import { useMutation } from '@tanstack/react-query'
import { createCrudMutations } from './createCrudMutations'
import { saveScripts } from '../../services/scripts/scriptsService'
import { queryKeys } from '../../constants/queryKeys'

const useCrud = createCrudMutations({
  queryKey: queryKeys.scripts,
  saveFn: saveScripts,
  uidParam: 'scriptUid',
  withAudit: true,
  extraCreateFields: { favorito: false, downloads: 0 },
  createLogMessage: (record) => `Cadastrou o script ${record.nome} (${record.categoria})`,
  updateLogMessage: (record) => `Editou o script ${record.nome} (${record.categoria})`,
  deleteLogMessage: (item) => `Excluiu o script ${item.nome}`,
  createSuccessMessage: 'Script cadastrado com sucesso.',
  updateSuccessMessage: 'Script atualizado com sucesso.',
  deleteSuccessMessage: 'Script excluído.',
  // toggleFavorite/registerDownload seguem o original: sem log de atividade
  // e sem toast, só persistem a mudança.
  useExtraMutations: ({ queryClient, queryKey, applyLocally, persist }) => ({
    toggleFavorite: useMutation({
      mutationFn: async (scriptUid) => {
        const list = queryClient.getQueryData(queryKey) || []
        const next = list.map((s) => (s.uid === scriptUid ? { ...s, favorito: !s.favorito } : s))
        applyLocally(next)
        await persist(next)
        return next.find((s) => s.uid === scriptUid)
      },
    }),
    registerDownload: useMutation({
      mutationFn: async (scriptUid) => {
        const list = queryClient.getQueryData(queryKey) || []
        const next = list.map((s) =>
          s.uid === scriptUid ? { ...s, downloads: (s.downloads || 0) + 1 } : s,
        )
        applyLocally(next)
        await persist(next)
      },
    }),
  }),
})

// CRUD de scripts sobre o kv_store — ver createCrudMutations para o
// comportamento comum (otimista, log de atividade, toast, persistência).
export function useScriptMutations() {
  const { create, update, remove, toggleFavorite, registerDownload } = useCrud()
  return {
    createScript: create,
    updateScript: update,
    deleteScript: remove,
    toggleFavorite,
    registerDownload,
  }
}
