import { createQueryHook } from './createQueryHook'
import { getContatos } from '../../services/contatos/contatosService'
import { queryKeys } from '../../constants/queryKeys'

export const useContatos = createQueryHook(queryKeys.contatos, getContatos)
