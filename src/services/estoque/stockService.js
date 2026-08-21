import { kvGet, kvGetWithMeta, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_estoque_data'

// Lê a lista de itens de estoque do kv_store — mesmo padrão de assetsService.js
// (o valor gravado é o array completo, sem embrulho).
export async function getStock() {
  return kvGet(DATA_KEY, { padrao: [] })
}

// Igual a getStock, mas inclui o `updated_at` da linha — ver getAssetsWithMeta.
export async function getStockWithMeta() {
  return kvGetWithMeta(DATA_KEY, { padrao: [] })
}

// Grava a lista completa de itens de estoque — cada escrita reescreve a
// lista inteira (mesmo padrão do saveStockData() original).
// `expectedUpdatedAt`: gravação condicional (compare-and-swap) — ver kvSet.
export async function saveStock(stock, expectedUpdatedAt) {
  await kvSet(DATA_KEY, stock, { expectedUpdatedAt })
}
