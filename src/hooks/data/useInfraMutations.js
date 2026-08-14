import { useMutation, useQueryClient } from '@tanstack/react-query'
import { getInfraWithMeta, saveInfra } from '../../services/infraestrutura/infraService'
import { pushLog } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'
import { KvConflictError } from '../../services/supabase/kvStore'

// Mutações de Infraestrutura sobre o kv_store, no mesmo padrão das demais
// (busca o valor mais recente do banco antes de calcular a mudança, cache
// otimista, log de atividade, toast, persiste por último de forma
// condicional — ver createCrudMutations.js) — mas sem exclusão em nenhum
// caso (o original não tem delete para infraestrutura).
export function useInfraMutations() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const autor = user?.email ? nameFromEmail(user.email) : undefined

  function applyLocally(next) {
    queryClient.setQueryData(queryKeys.infraestrutura, next)
  }

  async function persist(next, expectedUpdatedAt) {
    try {
      await saveInfra(next, expectedUpdatedAt)
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

  // getInfraWithMeta() (a leitura que toda mutação faz ANTES de aplicar a
  // mudança) não tinha tratamento de erro — se caísse (sessão expirada, sem
  // rede), a mutação falhava sem toast, sem mensagem nenhuma visível (não
  // há onError em lugar nenhum do app). Mesmo texto que persist() já usa
  // pro mesmo tipo de problema, só que na ponta de leitura.
  async function getFreshOrToast() {
    try {
      return await getInfraWithMeta()
    } catch (e) {
      showToast('Falha ao carregar os dados atuais. Verifique sua conexão com o Supabase.', 'danger')
      throw e
    }
  }

  const updateConstrushow = useMutation({
    mutationFn: async ({ idx, record }) => {
      const { value: current, updatedAt } = await getFreshOrToast()
      const unidade = current.construshow[idx].unidade
      const next = {
        ...current,
        construshow: current.construshow.map((c, i) => (i === idx ? { ...c, ...record } : c)),
      }
      applyLocally(next)
      await pushLog(`Atualizou o Construshow de ${unidade}.`, autor)
      showToast('Construshow atualizado.')
      await persist(next, updatedAt)
    },
  })

  const updateWifi = useMutation({
    mutationFn: async ({ idx, record }) => {
      const { value: current, updatedAt } = await getFreshOrToast()
      const unidade = current.wifi[idx].unidade
      const next = {
        ...current,
        wifi: current.wifi.map((w, i) => (i === idx ? { ...w, ...record } : w)),
      }
      applyLocally(next)
      await pushLog(`Atualizou o Wi-Fi de ${unidade}.`, autor)
      showToast('Wi-Fi atualizado.')
      await persist(next, updatedAt)
    },
  })

  const addWifiNetwork = useMutation({
    mutationFn: async (unidade) => {
      const { value: current, updatedAt } = await getFreshOrToast()
      const count = current.wifi.filter((w) => w.unidade === unidade).length
      const newRecord = {
        unidade,
        redeNome: `Rede ${count + 1}`,
        ssid: '',
        senha: '',
        seguranca: '',
        ipInterno: '',
        ipExterno: '',
        gateway: '',
        dnsPrimario: '',
        dnsSecundario: '',
        observacoes: '',
      }
      const next = { ...current, wifi: [...current.wifi, newRecord] }
      const newIdx = next.wifi.length - 1
      applyLocally(next)
      await pushLog(`Adicionou uma nova rede Wi-Fi para ${unidade}.`, autor)
      await persist(next, updatedAt)
      return newIdx
    },
  })

  return { updateConstrushow, updateWifi, addWifiNetwork }
}
