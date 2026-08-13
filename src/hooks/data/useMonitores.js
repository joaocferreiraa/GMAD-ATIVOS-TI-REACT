import { createQueryHook } from './createQueryHook'
import { getMonitores } from '../../services/monitoramento/monitoresService'
import { queryKeys } from '../../constants/queryKeys'

export const useMonitores = createQueryHook(queryKeys.monitores, getMonitores)
