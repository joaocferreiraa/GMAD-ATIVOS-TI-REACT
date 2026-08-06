import { kvGet, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_scripts_data'

// Lê a lista de scripts do kv_store.
export async function getScripts() {
  return kvGet(DATA_KEY)
}

// Grava a lista completa de scripts — o kv_store guarda o array inteiro
// sob uma única chave, então toda escrita reescreve a lista completa
// (mesmo padrão do saveScriptData() original).
export async function saveScripts(scripts) {
  await kvSet(DATA_KEY, scripts)
}
