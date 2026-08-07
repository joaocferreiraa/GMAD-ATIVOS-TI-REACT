import { createQueryHook } from './createQueryHook'
import { getAssets } from '../../services/ativos/assetsService'
import { queryKeys } from '../../constants/queryKeys'

export const useAssets = createQueryHook(queryKeys.ativos, getAssets)
