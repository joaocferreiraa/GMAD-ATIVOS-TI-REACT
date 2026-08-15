import { useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../constants/queryKeys'
import { fetchTickets, fetchTicketTimeline } from '../../services/itService'

// Chamados de TI. Diferente dos outros hooks de leitura (createQueryHook),
// estes são parametrizados: a fila é filtrada por solicitante quando quem
// está vendo não é da equipe de TI.

export function useChamados({ requester } = {}) {
  return useQuery({
    queryKey: [...queryKeys.chamados, requester ?? 'todos'],
    queryFn: () => fetchTickets({ requester }),
  })
}

export function useChamadoTimeline(ticketId) {
  return useQuery({
    queryKey: [...queryKeys.chamadoTimeline, ticketId],
    queryFn: () => fetchTicketTimeline(ticketId),
    enabled: Boolean(ticketId),
  })
}

// Invalidação após uma ação (comentar, mudar status, atribuir). Recarrega a
// fila e a timeline do chamado mexido, sem precisar de refetch manual.
export function useInvalidateChamados() {
  const queryClient = useQueryClient()

  return (ticketId) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.chamados })
    if (ticketId) {
      queryClient.invalidateQueries({ queryKey: [...queryKeys.chamadoTimeline, ticketId] })
    }
  }
}
