import { createQueryHook } from './createQueryHook'
import { getStock } from '../../services/estoque/stockService'
import { queryKeys } from '../../constants/queryKeys'

export const useStock = createQueryHook(queryKeys.estoque, getStock)
