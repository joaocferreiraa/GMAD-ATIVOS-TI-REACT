import { kvGet, kvGetWithMeta, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_scripts_data'

// Lê a lista de scripts do kv_store.
export async function getScripts() {
  return kvGet(DATA_KEY, { padrao: [] })
}

// Igual a getScripts, mas inclui o `updated_at` da linha — ver
// getAssetsWithMeta.
export async function getScriptsWithMeta() {
  return kvGetWithMeta(DATA_KEY, { padrao: [] })
}

// Grava a lista completa de scripts — o kv_store guarda o array inteiro
// sob uma única chave, então toda escrita reescreve a lista completa
// (mesmo padrão do saveScriptData() original).
// `expectedUpdatedAt`: gravação condicional (compare-and-swap) — ver kvSet.
export async function saveScripts(scripts, expectedUpdatedAt) {
  await kvSet(DATA_KEY, scripts, { expectedUpdatedAt })
}
