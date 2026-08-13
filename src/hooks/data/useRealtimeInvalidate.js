import { useEffect, useId } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../services/supabase/client'

// Assina mudanças (INSERT por padrão) numa tabela do Postgres via Supabase
// Realtime e invalida a query informada quando algo chega — usado em vez de
// polling periódico, pra "tempo real" não custar uma requisição a cada N
// segundos independente de ter dado novo ou não. Precisa que a tabela
// esteja na publicação `supabase_realtime` (ver
// supabase/migrations/0001_network_monitoring.sql). Sem Supabase
// configurado (dev local sem .env), simplesmente não assina nada.
//
// O nome do canal usa useId() (único por instância do componente) em vez
// de derivar de `table`+`queryKey`: dois componentes montados ao mesmo
// tempo que observam a MESMA queryKey (ex: AlertsPanel na página e a ficha
// de um ponto, ambos com useAlertas({})) gerariam o mesmo nome de canal —
// o supabase-js reaproveita/colide com o canal já inscrito e lança "cannot
// add `postgres_changes` callbacks ... after `subscribe()`". Um id por
// instância garante canais independentes mesmo quando a query é idêntica.
export function useRealtimeInvalidate(table, queryKey, { event = 'INSERT', filter } = {}) {
  const queryClient = useQueryClient()
  const instanceId = useId()
  const filterKey = filter || ''

  useEffect(() => {
    if (!supabase || !table) return undefined
    const channel = supabase
      .channel(`realtime:${table}:${instanceId}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, ...(filter ? { filter } : {}) },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, instanceId, event, filterKey, JSON.stringify(queryKey)])
}
