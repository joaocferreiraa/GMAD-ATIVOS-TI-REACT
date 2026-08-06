import { useQuery } from '@tanstack/react-query'
import { getScripts } from '../../services/scripts/scriptsService'
import { queryKeys } from '../../constants/queryKeys'

export function useScripts() {
  return useQuery({
    queryKey: queryKeys.scripts,
    queryFn: getScripts,
  })
}
