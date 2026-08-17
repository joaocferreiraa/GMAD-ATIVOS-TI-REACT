import { useEffect, useId, useRef } from 'react'
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
//
// A QUERYKEY NÃO ENTRA NAS DEPENDÊNCIAS DO EFEITO, de propósito. Ela contém
// o início da janela de tempo (`sinceIso`), que avança de 5 em 5 minutos —
// se o efeito dependesse dela, o WebSocket seria destruído e reassinado a
// cada passo. Numa tela que fica aberta o dia todo (modo TV) isso dava ~432
// reciclagens de canal em 12h, cada uma com uma janela de segundos sem
// receber evento e uma chance de a reassinatura falhar em silêncio — a tela
// então parava de atualizar até o refresh de segurança salvar, ou de vez.
// Em vez disso o canal é criado UMA vez por tabela e a queryKey atual é
// lida de uma ref no momento da invalidação.
export function useRealtimeInvalidate(table, queryKey, { event = 'INSERT', filter } = {}) {
  const queryClient = useQueryClient()
  const instanceId = useId()
  const filterKey = filter || ''

  // Ref sempre com a queryKey mais recente: o callback do canal é criado
  // uma vez só, mas precisa invalidar a chave VIGENTE quando um evento
  // chega — não a que existia no momento da inscrição. A escrita vai num
  // efeito próprio (não no corpo do componente, que seria acesso a ref
  // durante o render).
  const queryKeyRef = useRef(queryKey)
  useEffect(() => {
    queryKeyRef.current = queryKey
  })

  useEffect(() => {
    if (!supabase || !table) return undefined

    const invalidar = () =>
      queryClient.invalidateQueries({ queryKey: queryKeyRef.current, refetchType: 'all' })

    const channel = supabase
      .channel(`realtime:${table}:${instanceId}`)
      .on(
        'postgres_changes',
        { event, schema: 'public', table, ...(filter ? { filter } : {}) },
        invalidar,
      )
      .subscribe((status) => {
        // CLOSED/CHANNEL_ERROR sem reconexão automática deixaria a tela
        // muda: o supabase-js reconecta o socket, mas um canal que caiu
        // por erro de servidor nem sempre volta sozinho. Invalidar ao
        // reconectar garante que o que passou durante a queda seja
        // buscado (postgres_changes não faz replay de eventos perdidos).
        if (status === 'SUBSCRIBED') invalidar()
      })

    // iOS fecha o WebSocket quando o app vai pra background (tela bloqueada,
    // troca de app) — mudanças no Postgres feitas nesse intervalo não são
    // reenviadas quando a conexão volta (postgres_changes não faz replay).
    // Forçar a invalidação ao voltar o foco garante dado fresco mesmo que a
    // reconexão do socket em si (já automática no supabase-js) tenha perdido
    // eventos no meio do caminho.
    function handleVisible() {
      if (document.visibilityState === 'visible') invalidar()
    }
    document.addEventListener('visibilitychange', handleVisible)

    return () => {
      document.removeEventListener('visibilitychange', handleVisible)
      supabase.removeChannel(channel)
    }
    // `queryKey` fica FORA das dependências de propósito — ver o comentário
    // no topo. O canal só é recriado se a tabela, o evento ou o filtro
    // mudarem, que é quando a assinatura em si deixa de ser válida.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, instanceId, event, filterKey])
}
