import { supabase } from './client'

// Wrapper genérico sobre a tabela kv_store (chave/valor em JSON) — o mesmo
// padrão de persistência usado por todos os domínios do sistema original
// (gmad_ativos_data, gmad_estoque_data, etc.), reaproveitado aqui em vez de
// reimplementado por serviço.

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    )
  }
  return supabase
}

export async function kvGet(key) {
  const { data, error } = await requireSupabase()
    .from('kv_store')
    .select('value')
    .eq('key', key)
    .single()
  if (error) throw error
  return data.value
}

export async function kvSet(key, value) {
  const { error } = await requireSupabase()
    .from('kv_store')
    .upsert({ key, value, updated_at: new Date().toISOString() })
  if (error) throw error
}
