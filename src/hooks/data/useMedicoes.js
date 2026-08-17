import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getBucketedMeasurements,
  getMeasurementsForMonitor,
  getRecentMeasurements,
  insertMeasurement,
} from '../../services/monitoramento/measurementsService'
import { useRealtimeInvalidate } from './useRealtimeInvalidate'
import { queryKeys } from '../../constants/queryKeys'

// Tamanho do intervalo de agregação a partir da duração da janela, pra quem
// só tem `minutes` em mãos (useMonitorHistory) e não a chave do período.
// Espelha BUCKET_SEGUNDOS_POR_PERIODO: até 1h não agrega (cada ping
// importa); acima disso, agrega o suficiente pra manter ~100-360 pontos.
function bucketFor(minutes) {
  if (!minutes || minutes <= 60) return null
  if (minutes <= 360) return 300 // 6h  -> 5 min
  if (minutes <= 1440) return 900 // 24h -> 15 min
  if (minutes <= 10080) return 3600 // 7d  -> 1 hora
  return 14400 // 30d -> 4 horas
}

// Passo em que a janela desliza. A janela NÃO pode ser recalculada a cada
// render (mudaria a queryKey toda hora, refazendo a busca sem parar), mas
// também não pode ficar congelada na montagem: numa tela que fica aberta
// por horas — o modo TV — o início da janela ficaria cada vez mais para
// trás no tempo, e "últimos 60 minutos" viraria "desde que a página
// abriu". Arredondar o instante para baixo num passo fixo resolve os dois:
// o valor só muda de 5 em 5 minutos, então a busca é refeita nesse ritmo e
// a janela acompanha o relógio.
const JANELA_PASSO_MS = 5 * 60 * 1000

// Função comum (não-hook) pra isolar a chamada impura (Date.now()): o React
// Compiler analisa a pureza de hooks/componentes e barra Date.now() direto
// no corpo deles, mas não enxerga dentro de uma função auxiliar comum.
function sinceIsoStep(minutes) {
  const agoraArredondado = Math.floor(Date.now() / JANELA_PASSO_MS) * JANELA_PASSO_MS
  return new Date(agoraArredondado - minutes * 60000).toISOString()
}

// Início da janela, recalculado quando `minutes` muda OU quando o passo de
// 5 min vira. O `setInterval` só dispara um setState quando o valor
// realmente muda, então não há re-render desnecessário entre os passos.
function useSinceIso(minutes) {
  const [sinceIso, setSinceIso] = useState(null)
  const [computedForMinutes, setComputedForMinutes] = useState(null)

  if (minutes !== computedForMinutes) {
    setComputedForMinutes(minutes)
    setSinceIso(sinceIsoStep(minutes))
  }

  useEffect(() => {
    if (!minutes) return undefined
    // Checa com folga em relação ao passo (30s) pra virada acontecer logo
    // depois do minuto cheio, não até 5 min atrasada.
    const id = setInterval(() => {
      const proximo = sinceIsoStep(minutes)
      setSinceIso((atual) => (atual === proximo ? atual : proximo))
    }, 30_000)
    return () => clearInterval(id)
  }, [minutes])

  return sinceIso
}

// Histórico de medições de UM ponto, nos últimos `minutes` — usado pela
// ficha do ponto (gráfico de histórico) e pelo gráfico em tempo real.
// Atualiza sozinho quando uma medição nova daquele ponto chega via
// Realtime, sem polling. Repare: a janela (`sinceIso`) é fixada no momento
// em que `minutes` muda, não escorrega segundo a segundo — trocar o
// período (ou reabrir a tela) recalcula o início da janela.
export function useMonitorHistory(monitorUid, minutes) {
  const sinceIso = useSinceIso(minutes)
  // Períodos longos vêm agregados do banco. Sem isso, o `limit` de
  // getMeasurementsForMonitor (2000 linhas) cortava o período
  // SILENCIOSAMENTE: com ping a cada 30s, "últimos 30 dias" mostrava só as
  // ~16 primeiras horas, com o eixo alegando 30 dias. Agregado, o volume
  // depende do tamanho do intervalo, não do período pedido.
  const bucketSegundos = bucketFor(minutes)
  const queryKey = [...queryKeys.medicoes, monitorUid, sinceIso, bucketSegundos]

  // Em período agregado, cada medição nova mexeria no máximo no último
  // bucket — refazer a agregação inteira a cada ping custa mais do que
  // vale. Períodos curtos (que é onde "tempo real" importa) seguem ao vivo.
  useRealtimeInvalidate(monitorUid && !bucketSegundos ? 'network_measurements' : null, queryKey, {
    filter: `monitor_uid=eq.${monitorUid}`,
  })

  return useQuery({
    queryKey,
    queryFn: () =>
      bucketSegundos
        ? getBucketedMeasurements(sinceIso, bucketSegundos, [monitorUid])
        : getMeasurementsForMonitor(monitorUid, sinceIso),
    enabled: !!monitorUid && !!sinceIso,
  })
}

// Histórico agregado por intervalo, de VÁRIOS pontos de uma vez — alimenta
// o gráfico comparativo e o painel de gráficos. `bucketSegundos` null cai
// pra medições cruas (períodos curtos, ver BUCKET_SEGUNDOS_POR_PERIODO);
// caso contrário agrega no banco, devolvendo um número de pontos que não
// cresce com o período pedido.
//
// `uids` é um array — passado direto na queryKey, o React Query já compara
// arrays por valor (não por identidade), então uma lista recriada a cada
// render com o mesmo conteúdo não refaz a busca.
export function useBucketedHistory(uids, minutes, bucketSegundos) {
  const sinceIso = useSinceIso(minutes)
  const uidList = uids?.length ? uids : null
  const queryKey = [...queryKeys.medicoes, 'buckets', uidList, sinceIso, bucketSegundos]

  // Só assina Realtime em período curto/sem agregação: numa janela de 30
  // dias, cada ping novo mudaria no máximo o último bucket de 4h — refazer
  // a agregação inteira a cada medição custaria muito mais do que o
  // pouquíssimo que a tela ganharia. Períodos curtos continuam ao vivo.
  useRealtimeInvalidate(bucketSegundos ? null : 'network_measurements', queryKey)

  return useQuery({
    queryKey,
    queryFn: () =>
      bucketSegundos
        ? getBucketedMeasurements(sinceIso, bucketSegundos, uidList)
        : getRecentMeasurements(sinceIso).then((rows) =>
            // getRecentMeasurements vem do mais novo pro mais antigo e traz
            // todos os pontos; os gráficos esperam ordem crescente e só os
            // pontos pedidos.
            rows
              .filter((r) => r.monitorUid && (!uidList || uidList.includes(r.monitorUid)))
              .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
          ),
    enabled: !!sinceIso && !!uidList,
  })
}

// Medições recentes de TODOS os pontos — alimenta o resumo geral e a
// classificação de status/oscilação de cada ponto na listagem (ver
// utils/networkStatus.js). Janela padrão: última hora (suficiente pra
// status atual + detecção de oscilação; histórico de período maior é
// buscado sob demanda na ficha de cada ponto).
export function useRecentMeasurements(minutes = 60) {
  const sinceIso = useSinceIso(minutes)
  const queryKey = [...queryKeys.medicoes, 'recentes', sinceIso]

  useRealtimeInvalidate('network_measurements', queryKey)

  return useQuery({
    queryKey,
    queryFn: () => getRecentMeasurements(sinceIso),
    enabled: !!sinceIso,
  })
}

// Grava uma medição avulsa (teste de velocidade rodado manualmente no
// navegador — ver utils/speedTest.js) e invalida as queries de medições
// recentes pra refletir na tela na hora (o Realtime também dispararia
// isso, mas invalidar direto evita esperar o round-trip do evento).
export function useInsertMeasurement() {
  const queryClient = useQueryClient()
  return async function insert(measurement) {
    await insertMeasurement(measurement)
    queryClient.invalidateQueries({ queryKey: queryKeys.medicoes })
  }
}
