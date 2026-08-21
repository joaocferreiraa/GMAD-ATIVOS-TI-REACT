import { kvGet, kvGetWithMeta, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_instaladores_data'

// Lê a lista de instaladores do kv_store.
export async function getInstaladores() {
  return kvGet(DATA_KEY, { padrao: [] })
}

// Igual a getInstaladores, mas inclui o `updated_at` da linha — ver
// getAssetsWithMeta.
export async function getInstaladoresWithMeta() {
  return kvGetWithMeta(DATA_KEY, { padrao: [] })
}

// Grava a lista completa de instaladores — o kv_store guarda o array
// inteiro sob uma única chave, então toda escrita reescreve a lista
// completa (mesmo padrão do saveInstallerData() original).
// `expectedUpdatedAt`: gravação condicional (compare-and-swap) — ver kvSet.
export async function saveInstaladores(installers, expectedUpdatedAt) {
  await kvSet(DATA_KEY, installers, { expectedUpdatedAt })
}
