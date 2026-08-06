import { useQuery } from '@tanstack/react-query'
import { getLogEntries } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'

export function useAtividade() {
  return useQuery({
    queryKey: queryKeys.atividade,
    queryFn: getLogEntries,
  })
}
