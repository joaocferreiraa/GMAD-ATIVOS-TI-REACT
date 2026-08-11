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
    markOffline()
    throw e
  }
}

export async function kvSet(key, value) {
  markSyncing()
  try {
    const { error } = await requireSupabase()
      .from('kv_store')
      .upsert({ key, value, updated_at: new Date().toISOString() })
    if (error) throw error
    markConnected()
  } catch (e) {
    markOffline()
    throw e
  }
}
