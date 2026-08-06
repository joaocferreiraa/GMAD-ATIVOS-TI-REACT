import { useQuery } from '@tanstack/react-query'
import { getInstaladores } from '../../services/instaladores/installersService'
import { queryKeys } from '../../constants/queryKeys'

export function useInstaladores() {
  return useQuery({
    queryKey: queryKeys.instaladores,
    queryFn: getInstaladores,
  })
}
