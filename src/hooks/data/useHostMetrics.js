import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  getRecentHostMetrics,
  getBucketedHostMetrics,
} from '../../services/monitoramento/hostMetricsService'
import { useRealtimeInvalidate } from './useRealtimeInvalidate'
import { queryKeys } from '../../constants/queryKeys'

// Janela deslizante em passos de 5 min — mesma solução (e mesmo motivo) de
// useMedicoes.js: congelada na montagem, "últimos 60 minutos" viraria
// "desde que a página abriu" numa tela que fica horas aberta (modo TV).
const JANELA_PASSO_MS = 5 * 60 * 1000

// Mantém os dados anteriores enquanto a nova janela carrega — sem isso a
// tela pisca a cada passo de 5 min (mesma razão documentada em
// useMedicoes.js).
const MANTER_ANTERIOR = (anterior) => anterior

// Função comum (não-hook) pra isolar a chamada impura Date.now() do corpo
// do hook (exigência do React Compiler).
function sinceIsoStep(minutes) {
  const agoraArredondado = Math.floor(Date.now() / JANELA_PASSO_MS) * JANELA_PASSO_MS
  return new Date(agoraArredondado - minutes * 60000).toISOString()
}

function useSinceIso(minutes) {
  const [sinceIso, setSinceIso] = useState(null)
  const [computedFor, setComputedFor] = useState(null)

  if (minutes !== computedFor) {
    setComputedFor(minutes)
    setSinceIso(sinceIsoStep(minutes))
  }

  useEffect(() => {
    if (!minutes) return undefined
    const id = setInterval(() => {
      const proximo = sinceIsoStep(minutes)
      setSinceIso((atual) => (atual === proximo ? atual : proximo))
    }, 30_000)
    return () => clearInterval(id)
  }, [minutes])

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
    // A tabela pode não existir ainda (migration 0006 não rodada). Sem
    // retry, o erro aparece na hora como aviso acionável em vez de o
    // painel ficar tentando em silêncio.
    retry: false,
    placeholderData: MANTER_ANTERIOR,
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
    placeholderData: MANTER_ANTERIOR,
  })
}
