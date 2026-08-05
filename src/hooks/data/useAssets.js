import { useQuery } from '@tanstack/react-query'
import { getAssets } from '../../services/ativos/assetsService'
import { queryKeys } from '../../constants/queryKeys'

export function useAssets() {
  return useQuery({
    queryKey: queryKeys.ativos,
    queryFn: getAssets,
  })
}
