import { createQueryHook } from './createQueryHook'
import { getInfra } from '../../services/infraestrutura/infraService'
import { queryKeys } from '../../constants/queryKeys'

export const useInfra = createQueryHook(queryKeys.infraestrutura, getInfra)
