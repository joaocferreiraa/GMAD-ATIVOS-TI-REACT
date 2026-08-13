import { kvGet, kvGetWithMeta, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_network_monitors'

// Lê a lista de pontos monitorados do kv_store — mesmo padrão de
// assetsService.js/stockService.js (config pequena, escrita rara: cabe bem
// no padrão kv_store, ao contrário das medições — ver measurementsService.js
// e supabase/migrations/0001_network_monitoring.sql pra entender a diferença).
export async function getMonitores() {
  return kvGet(DATA_KEY)
}

// Igual a getMonitores, mas inclui o `updated_at` da linha — ver getAssetsWithMeta.
export async function getMonitoresWithMeta() {
  return kvGetWithMeta(DATA_KEY)
}

// Grava a lista completa de pontos monitorados — cada escrita reescreve a
// lista inteira. `expectedUpdatedAt`: gravação condicional (compare-and-swap) — ver kvSet.
export async function saveMonitores(monitores, expectedUpdatedAt) {
  await kvSet(DATA_KEY, monitores, { expectedUpdatedAt })
}
