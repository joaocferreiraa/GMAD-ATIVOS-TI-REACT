import { kvGet, kvGetWithMeta, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_infra_data'

// Lê os dados de infraestrutura do kv_store — objeto único
// { construshow: [...], wifi: [...] }, ao contrário dos demais módulos
// (que guardam um array puro): Construshow e Wi-Fi são duas coleções com
// formatos de registro completamente diferentes, não um único tipo de
// "item de infraestrutura".
// Estado vazio deste módulo. Não é `[]` como nos demais nem `{}`: as duas
// coleções precisam EXISTIR como arrays, porque as mutações fazem
// `current.construshow.map(...)` e `current.wifi.filter(...)` direto (ver
// useInfraMutations) — com `{}` a primeira gravação numa base nova estouraria
// em "cannot read properties of undefined".
const VAZIO = { construshow: [], wifi: [] }

export async function getInfra() {
  return kvGet(DATA_KEY, { padrao: VAZIO })
}

// Igual a getInfra, mas inclui o `updated_at` da linha — ver
// getAssetsWithMeta.
export async function getInfraWithMeta() {
  return kvGetWithMeta(DATA_KEY, { padrao: VAZIO })
}

// Grava o objeto completo de infraestrutura — toda escrita reescreve
// { construshow, wifi } inteiro (mesmo padrão do saveInfraData() original).
// `expectedUpdatedAt`: gravação condicional (compare-and-swap) — ver kvSet.
export async function saveInfra(infraData, expectedUpdatedAt) {
  await kvSet(DATA_KEY, infraData, { expectedUpdatedAt })
}
