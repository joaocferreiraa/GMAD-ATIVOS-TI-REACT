import { kvGet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_ativos_data'

// Lê a lista de ativos do kv_store. O Dashboard é somente leitura — o
// provisionamento inicial (dados de exemplo quando a chave ainda não existe)
// pertence à tela de Ativos cadastrados, que faz a escrita.
export async function getAssets() {
  return kvGet(DATA_KEY)
}
