import { useQuery } from '@tanstack/react-query'
import { getInfra } from '../../services/infraestrutura/infraService'
import { queryKeys } from '../../constants/queryKeys'

export function useInfra() {
  return useQuery({
    queryKey: queryKeys.infraestrutura,
    queryFn: getInfra,
  })
}
