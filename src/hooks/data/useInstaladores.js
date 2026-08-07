import { createQueryHook } from './createQueryHook'
import { getInstaladores } from '../../services/instaladores/installersService'
import { queryKeys } from '../../constants/queryKeys'

export const useInstaladores = createQueryHook(queryKeys.instaladores, getInstaladores)
