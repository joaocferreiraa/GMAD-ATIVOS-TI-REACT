import { kvGet, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_instaladores_data'

// Lê a lista de instaladores do kv_store.
export async function getInstaladores() {
  return kvGet(DATA_KEY)
}

// Grava a lista completa de instaladores — o kv_store guarda o array
// inteiro sob uma única chave, então toda escrita reescreve a lista
// completa (mesmo padrão do saveInstallerData() original).
export async function saveInstaladores(installers) {
  await kvSet(DATA_KEY, installers)
}
