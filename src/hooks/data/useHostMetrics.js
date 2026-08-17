import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getRecentHostMetrics,
  getBucketedHostMetrics,
} from '../../services/monitoramento/hostMetricsService'
import { useRealtimeInvalidate } from './useRealtimeInvalidate'
import { queryKeys } from '../../constants/queryKeys'

// Mesmo padrão de useMedicoes.js: função comum (não-hook) pra isolar a
// chamada impura Date.now() do corpo do hook.
function sinceIsoFor(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString()
}

function useSinceIso(minutes) {
  const [sinceIso, setSinceIso] = useState(null)
  const [computedFor, setComputedFor] = useState(null)
  if (minutes !== computedFor) {
    setComputedFor(minutes)
    setSinceIso(sinceIsoFor(minutes))
  }
  return sinceIso
}

// Métricas recentes de todos os hosts que rodam o agente — alimenta os
// cards de estado atual (CPU/RAM/disco/uptime) do painel de infraestrutura.
// Atualiza sozinho via Realtime quando o agente grava uma coleta nova.
export function useRecentHostMetrics(minutes = 60) {
  const sinceIso = useSinceIso(minutes)
  const queryKey = [...queryKeys.hostMetrics, 'recentes', sinceIso]

  useRealtimeInvalidate('host_metrics', queryKey)

  return useQuery({
    queryKey,
    queryFn: () => getRecentHostMetrics(sinceIso),
    enabled: !!sinceIso,
    // A tabela pode não existir ainda (migration 0004 não rodada). Sem
    // retry, o erro aparece na hora como aviso acionável em vez de o
    // painel ficar tentando em silêncio.
    retry: false,
  })
}

// Histórico agregado por intervalo, pros gráficos de CPU/memória do painel.
export function useBucketedHostMetrics(hosts, minutes, bucketSegundos) {
  const sinceIso = useSinceIso(minutes)
  const hostList = hosts?.length ? hosts : null
  const queryKey = [...queryKeys.hostMetrics, 'buckets', hostList, sinceIso, bucketSegundos]

  // Só assina Realtime sem agregação (períodos curtos) — mesma razão de
  // useBucketedHistory: refazer uma agregação de 30 dias a cada coleta
  // custa muito mais do que a atualização vale.
  useRealtimeInvalidate(bucketSegundos ? null : 'host_metrics', queryKey)

  return useQuery({
    queryKey,
    queryFn: () =>
      bucketSegundos
        ? getBucketedHostMetrics(sinceIso, bucketSegundos, hostList)
        : getRecentHostMetrics(sinceIso).then((rows) =>
            // getRecentHostMetrics vem do mais novo pro mais antigo; os
            // gráficos esperam ordem crescente.
            rows
              .filter((r) => !hostList || hostList.includes(r.host))
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
          ),
    enabled: !!sinceIso,
    retry: false,
  })
}
