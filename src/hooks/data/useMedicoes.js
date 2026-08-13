import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getMeasurementsForMonitor,
  getRecentMeasurements,
  insertMeasurement,
} from '../../services/monitoramento/measurementsService'
import { useRealtimeInvalidate } from './useRealtimeInvalidate'
import { queryKeys } from '../../constants/queryKeys'

// Função comum (não-hook) pra isolar a chamada impura (Date.now()) — o
// React Compiler analisa a pureza de hooks/componentes e barra Date.now()
// direto no corpo deles, mas não enxerga dentro de uma função auxiliar
// comum (mesmo motivo pelo qual relativeSyncTime()/fmtRelTime(), que também
// chamam Date.now(), já são usadas direto em render em outros lugares do
// projeto sem reclamação do linter).
function sinceIsoFor(minutes) {
  return new Date(Date.now() - minutes * 60000).toISOString()
}

// Calcula o início da janela só quando `minutes` muda — comparação com o
// valor anterior durante o render, em vez de useMemo ou useEffect+setState
// (mesmo padrão já usado em CommandPalette.jsx/AtivosPage.jsx pra outros
// casos de "recalcula só quando X muda").
function useSinceIso(minutes) {
  const [sinceIso, setSinceIso] = useState(null)
  const [computedForMinutes, setComputedForMinutes] = useState(null)
  if (minutes !== computedForMinutes) {
    setComputedForMinutes(minutes)
    setSinceIso(sinceIsoFor(minutes))
  }
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
  const queryKey = [...queryKeys.medicoes, monitorUid, sinceIso]

  useRealtimeInvalidate(monitorUid ? 'network_measurements' : null, queryKey, {
    filter: `monitor_uid=eq.${monitorUid}`,
  })

  return useQuery({
    queryKey,
    queryFn: () => getMeasurementsForMonitor(monitorUid, sinceIso),
    enabled: !!monitorUid && !!sinceIso,
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
