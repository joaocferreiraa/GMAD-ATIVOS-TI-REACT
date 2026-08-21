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
  // Rótulo legível do registro, gravado no histórico junto da ação (ver
  // pushLog). Opcional: sem ele o histórico ainda registra quem fez o quê e
  // guarda o registro inteiro em `dados`, só não tem um nome curto pronto
  // para exibir. Ex.: (ativo) => ativo.id, (contato) => contato.nome.
  getRotulo,
  createLogMessage,
  updateLogMessage,
  deleteLogMessage,
  createSuccessMessage,
  updateSuccessMessage,
  deleteSuccessMessage,
  extraCreateFields,
  // Campo que precisa ser único entre os registros (ex: 'id' em Ativos —
  // hostname/tag usado em busca, tabela, CSV e relatórios). Opcional: só
  // módulos que realmente têm um campo assim passam isso; os demais
  // continuam sem nenhuma checagem extra. A comparação usa SEMPRE a lista
  // recém-buscada (getFreshOrToast), não o cache local que sugeriu o
  // valor — é isso que fecha a corrida entre duas sessões criando um
  // registro com o mesmo valor quase ao mesmo tempo, cada uma vendo os
  // dados de antes da outra salvar.
  uniqueField,
  duplicateMessage = (value) => `Já existe um registro com "${value}" — use outro valor.`,
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

    // Contexto estruturado do histórico (ver pushLog). `entidade` sai da
    // queryKey — é o mesmo vocabulário que o app já usa para nomear o módulo,
    // então não há uma segunda lista de nomes para manter em sincronia.
    // `dados` leva o registro inteiro: em 'excluir' é o que permite
    // recadastrar à mão o que sumiu por engano.
    const entidade = Array.isArray(queryKey) ? String(queryKey[0]) : String(queryKey)
    function contextoDoHistorico(acao, registro) {
      return {
        acao,
        entidade,
        entidadeUid: registro?.uid,
        rotulo: getRotulo ? getRotulo(registro) : undefined,
        dados: registro,
      }
    }

    async function persist(next, expectedUpdatedAt) {
      try {
        await saveFn(next, expectedUpdatedAt)
      } catch (e) {
        if (e instanceof KvConflictError) {
          const { value: latest } = await getFreshOrToast()
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

    // getFreshFn() (a leitura que toda mutação faz ANTES de aplicar a
    // mudança) não tinha tratamento de erro nenhum — se caísse (sessão
    // expirada, sem rede), a mutação falhava sem toast, sem mensagem, sem
    // nada visível (não há onError em lugar nenhum do app). Mesma mensagem
    // de falha que persist() já usa pro mesmo tipo de problema, só que na
    // ponta de leitura em vez da de gravação — e relança pra quem chamou
    // saber que a operação não aconteceu (ex: o modal não deve fechar).
    async function getFreshOrToast() {
      try {
        return await getFreshFn()
      } catch (e) {
        showToast(
          'Falha ao carregar os dados atuais. Verifique sua conexão com o Supabase.',
          'danger',
        )
        throw e
      }
    }

    // Só relevante quando `uniqueField` foi passado. `excludeUid`: ao editar,
    // o próprio registro não conta como duplicata dele mesmo.
    function findDuplicate(list, value, excludeUid) {
      if (!uniqueField || value === undefined || value === '') return undefined
      return list.find((item) => item.uid !== excludeUid && item[uniqueField] === value)
    }

    const create = useMutation({
      mutationFn: async (record) => {
        const { value: list, updatedAt } = await getFreshOrToast()
        if (findDuplicate(list, record[uniqueField])) {
          showToast(duplicateMessage(record[uniqueField]), 'danger')
          throw new Error(`Valor duplicado em "${uniqueField}"`)
        }
        const newRecord = {
          ...record,
          uid: uid(),
          ...extraCreateFields,
          ...(withAudit ? { atualizadoEm: new Date().toISOString(), atualizadoPor: autor } : null),
        }
        const next = [...list, newRecord]
        applyLocally(next)
        await pushLog(createLogMessage(record), autor, contextoDoHistorico('criar', newRecord))
        showToast(createSuccessMessage)
        await persist(next, updatedAt)
        return newRecord
      },
    })

    const update = useMutation({
      mutationFn: async (payload) => {
        const targetUid = payload[uidParam]
        const { record } = payload
        const { value: list, updatedAt } = await getFreshOrToast()
        // Só barra quando o valor único está REALMENTE mudando. Como essa
        // checagem não existia antes, dados de produção podem já ter
        // duplicatas antigas — sem essa condição, editar QUALQUER campo
        // (mesmo sem tocar no valor único) de um desses registros ficaria
        // bloqueado pra sempre, sem forma de corrigir pela própria tela.
        const targetItem = list.find((item) => item.uid === targetUid)
        const uniqueValueChanged =
          uniqueField && targetItem && record[uniqueField] !== targetItem[uniqueField]
        if (uniqueValueChanged && findDuplicate(list, record[uniqueField], targetUid)) {
          showToast(duplicateMessage(record[uniqueField]), 'danger')
          throw new Error(`Valor duplicado em "${uniqueField}"`)
        }
        const patch = withAudit
          ? { ...record, atualizadoEm: new Date().toISOString(), atualizadoPor: autor }
          : { ...record }
        const next = list.map((item) => (item.uid === targetUid ? { ...item, ...patch } : item))
        const atualizado = next.find((item) => item.uid === targetUid)
        applyLocally(next)
        await pushLog(updateLogMessage(record), autor, contextoDoHistorico('editar', atualizado))
        showToast(updateSuccessMessage)
        await persist(next, updatedAt)
        return atualizado
      },
    })

    const remove = useMutation({
      mutationFn: async (item) => {
        const { value: list, updatedAt } = await getFreshOrToast()
        const next = list.filter((i) => i.uid !== item.uid)
        applyLocally(next)
        // `item` vai inteiro para `dados`: sem separação de permissão, este
        // registro é o que permite refazer à mão uma exclusão equivocada.
        await pushLog(deleteLogMessage(item), autor, contextoDoHistorico('excluir', item))
        showToast(deleteSuccessMessage, 'danger')
        await persist(next, updatedAt)
      },
    })

    // Mutações extras específicas de um domínio (ex: favoritar/registrar
    // download em Scripts) que não fazem parte do padrão CRUD comum — mesmas
    // `applyLocally`/`persist`/`getFreshFn` (já com o toast de falha de
    // leitura), sem log de atividade nem toast de sucesso.
    const extra = useExtraMutations({
      queryClient,
      queryKey,
      applyLocally,
      persist,
      getFreshFn: getFreshOrToast,
    })

    return { create, update, remove, ...extra }
  }
}
