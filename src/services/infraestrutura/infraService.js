import { kvGet, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_infra_data'

// Lê os dados de infraestrutura do kv_store — objeto único
// { construshow: [...], wifi: [...] }, ao contrário dos demais módulos
// (que guardam um array puro): Construshow e Wi-Fi são duas coleções com
// formatos de registro completamente diferentes, não um único tipo de
// "item de infraestrutura".
export async function getInfra() {
  return kvGet(DATA_KEY)
}

// Grava o objeto completo de infraestrutura — toda escrita reescreve
// { construshow, wifi } inteiro (mesmo padrão do saveInfraData() original).
export async function saveInfra(infraData) {
  await kvSet(DATA_KEY, infraData)
}
