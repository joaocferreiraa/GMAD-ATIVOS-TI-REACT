import { supabase } from './client'
import { markConnected, markOffline, markSyncing } from './syncStatus'

// Wrapper genérico sobre a tabela kv_store (chave/valor em JSON) — o mesmo
// padrão de persistência usado por todos os domínios do sistema original
// (gmad_ativos_data, gmad_estoque_data, etc.), reaproveitado aqui em vez de
// reimplementado por serviço. Cada chamada marca o indicador de
// sincronização como 'syncing' antes e 'connected'/'offline' depois, igual
// ao kvGet/kvSet do sistema original.

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    )
  }
  return supabase
}

export async function kvGet(key) {
  markSyncing()
  try {
    const { data, error } = await requireSupabase()
      .from('kv_store')
      .select('value')
      .eq('key', key)
      .single()
    if (error) throw error
    markConnected()
    return data.value
  } catch (e) {
    markOffline(e)
    throw e
  }
}

// Igual a kvGet, mas também devolve o `updated_at` da linha — usado pelas
// mutações pra ler o valor mais recente (não o do cache local, que pode
// estar desatualizado) e depois gravar de forma condicional via kvSet.
export async function kvGetWithMeta(key) {
  markSyncing()
  try {
    const { data, error } = await requireSupabase()
      .from('kv_store')
      .select('value, updated_at')
      .eq('key', key)
      .single()
    if (error) throw error
    markConnected()
    return { value: data.value, updatedAt: data.updated_at }
  } catch (e) {
    markOffline(e)
    throw e
  }
}

// Erro específico de conflito de escrita — ver kvSet(expectedUpdatedAt).
export class KvConflictError extends Error {
  constructor(key) {
    super(`Conflito ao gravar "${key}": outra sessão alterou os dados nesse meio-tempo.`)
    this.name = 'KvConflictError'
  }
}

// `expectedUpdatedAt`: quando informado, a gravação só acontece se o
// `updated_at` da linha ainda for esse (compare-and-swap) — se outra sessão
// já tiver gravado por cima, lança KvConflictError em vez de sobrescrever
// silenciosamente. Sem esse parâmetro, grava incondicionalmente (upsert),
// mesmo comportamento de antes.
export async function kvSet(key, value, { expectedUpdatedAt } = {}) {
  markSyncing()
  try {
    const sb = requireSupabase()
    const nextUpdatedAt = new Date().toISOString()
    if (expectedUpdatedAt !== undefined) {
      const { data, error } = await sb
        .from('kv_store')
        .update({ value, updated_at: nextUpdatedAt })
        .eq('key', key)
        .eq('updated_at', expectedUpdatedAt)
        .select('key')
      if (error) throw error
      if (!data || data.length === 0) {
        markConnected()
        throw new KvConflictError(key)
      }
    } else {
      const { error } = await sb.from('kv_store').upsert({ key, value, updated_at: nextUpdatedAt })
      if (error) throw error
    }
    markConnected()
  } catch (e) {
    if (!(e instanceof KvConflictError)) markOffline(e)
    throw e
  }
}
