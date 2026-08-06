import { useQuery } from '@tanstack/react-query'
import { getStock } from '../../services/estoque/stockService'
import { queryKeys } from '../../constants/queryKeys'

export function useStock() {
  return useQuery({
    queryKey: queryKeys.estoque,
    queryFn: getStock,
  })
}
