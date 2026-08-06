import { useMutation, useQueryClient } from '@tanstack/react-query'
import { saveInfra } from '../../services/infraestrutura/infraService'
import { pushLog } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'
import { useToast } from '../useToast'
import { useAuth } from '../auth/useAuth'
import { nameFromEmail } from '../../utils/formatters'

// Mutações de Infraestrutura sobre o kv_store, no mesmo padrão das demais
// (cache otimista, log de atividade, toast, persiste por último) — mas sem
// exclusão em nenhum caso (o original não tem delete para infraestrutura).
export function useInfraMutations() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const { user } = useAuth()
  const autor = user?.email ? nameFromEmail(user.email) : undefined

  function applyLocally(next) {
    queryClient.setQueryData(queryKeys.infraestrutura, next)
  }

  async function persist(next) {
    try {
      await saveInfra(next)
    } catch {
      showToast('Falha ao salvar. Verifique sua conexão com o Supabase.', 'danger')
    }
  }

  const updateConstrushow = useMutation({
    mutationFn: async ({ idx, record }) => {
      const current = queryClient.getQueryData(queryKeys.infraestrutura)
      const unidade = current.construshow[idx].unidade
      const next = {
        ...current,
        construshow: current.construshow.map((c, i) => (i === idx ? { ...c, ...record } : c)),
      }
      applyLocally(next)
      await pushLog(`Atualizou o Construshow de ${unidade}.`, autor)
      showToast('Construshow atualizado.')
      await persist(next)
    },
  })

  const updateWifi = useMutation({
    mutationFn: async ({ idx, record }) => {
      const current = queryClient.getQueryData(queryKeys.infraestrutura)
      const unidade = current.wifi[idx].unidade
      const next = {
        ...current,
        wifi: current.wifi.map((w, i) => (i === idx ? { ...w, ...record } : w)),
      }
      applyLocally(next)
      await pushLog(`Atualizou o Wi-Fi de ${unidade}.`, autor)
      showToast('Wi-Fi atualizado.')
      await persist(next)
    },
  })

  const addWifiNetwork = useMutation({
    mutationFn: async (unidade) => {
      const current = queryClient.getQueryData(queryKeys.infraestrutura)
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
      await persist(next)
      return newIdx
    },
  })

  return { updateConstrushow, updateWifi, addWifiNetwork }
}
