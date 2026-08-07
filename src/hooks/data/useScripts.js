import { createQueryHook } from './createQueryHook'
import { getScripts } from '../../services/scripts/scriptsService'
import { queryKeys } from '../../constants/queryKeys'

export const useScripts = createQueryHook(queryKeys.scripts, getScripts)
