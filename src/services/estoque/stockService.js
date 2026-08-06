import { kvGet, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_estoque_data'

// Lê a lista de itens de estoque do kv_store — mesmo padrão de assetsService.js
// (o valor gravado é o array completo, sem embrulho).
export async function getStock() {
  return kvGet(DATA_KEY)
}

// Grava a lista completa de itens de estoque — cada escrita reescreve a
// lista inteira (mesmo padrão do saveStockData() original).
export async function saveStock(stock) {
  await kvSet(DATA_KEY, stock)
}
