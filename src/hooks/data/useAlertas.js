import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getAlerts, resolveAlertsOfType } from '../../services/monitoramento/measurementsService'
import { useRealtimeInvalidate } from './useRealtimeInvalidate'
import { queryKeys } from '../../constants/queryKeys'

// Alertas abertos/recentes — atualiza sozinho via Realtime (INSERT de um
// alerta novo, ou UPDATE quando um alerta é resolvido).
export function useAlertas({ onlyUnresolved = false } = {}) {
  const queryKey = [...queryKeys.alertas, onlyUnresolved]

  useRealtimeInvalidate('network_alerts', queryKey, { event: '*' })

  return useQuery({
    queryKey,
    queryFn: () => getAlerts({ onlyUnresolved }),
  })
}

export function useResolveAlert() {
  const queryClient = useQueryClient()
  return async function resolve(monitorUid, tipo) {
    await resolveAlertsOfType(monitorUid, tipo)
    queryClient.invalidateQueries({ queryKey: queryKeys.alertas })
  }
}
