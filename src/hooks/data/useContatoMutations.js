import { createCrudMutations } from './createCrudMutations'
import { saveContatos } from '../../services/contatos/contatosService'
import { queryKeys } from '../../constants/queryKeys'

const useCrud = createCrudMutations({
  queryKey: queryKeys.contatos,
  saveFn: saveContatos,
  uidParam: 'contatoUid',
  withAudit: false,
  createLogMessage: (record) => `Cadastrou o colaborador ${record.nome} (${record.departamento})`,
  updateLogMessage: (record) => `Editou o colaborador ${record.nome} (${record.departamento})`,
  deleteLogMessage: (contato) => `Excluiu o colaborador ${contato.nome}`,
  createSuccessMessage: 'Colaborador cadastrado com sucesso.',
  updateSuccessMessage: 'Colaborador atualizado com sucesso.',
  deleteSuccessMessage: 'Colaborador excluído.',
})

// CRUD de colaboradores sobre o kv_store — ver createCrudMutations para o
// comportamento comum (otimista, log de atividade, toast, persistência).
export function useContatoMutations() {
  const { create, update, remove } = useCrud()
  return { createContato: create, updateContato: update, deleteContato: remove }
}
