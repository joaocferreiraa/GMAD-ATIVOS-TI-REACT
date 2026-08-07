import { useQuery } from '@tanstack/react-query'

// Factory para hooks de leitura que só encapsulam useQuery({ queryKey, queryFn }).
export function createQueryHook(queryKey, queryFn) {
  return function useEntityQuery() {
    return useQuery({ queryKey, queryFn })
  }
}
