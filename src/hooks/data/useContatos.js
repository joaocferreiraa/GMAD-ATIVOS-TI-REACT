import { useQuery } from '@tanstack/react-query'
import { getContatos } from '../../services/contatos/contatosService'
import { queryKeys } from '../../constants/queryKeys'

export function useContatos() {
  return useQuery({
    queryKey: queryKeys.contatos,
    queryFn: getContatos,
  })
}
