import { createQueryHook } from './createQueryHook'
import { getLogEntries } from '../../services/activityLog/activityLogService'
import { queryKeys } from '../../constants/queryKeys'

export const useAtividade = createQueryHook(queryKeys.atividade, getLogEntries)
