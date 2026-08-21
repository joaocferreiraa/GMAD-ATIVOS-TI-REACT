import { kvGet, kvGetWithMeta, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_contatos_v1'

// Lê a lista de colaboradores do kv_store — o valor gravado é um objeto
// `{ colaboradores: [...] }` (não um array puro, ao contrário de Ativos),
// mesmo formato usado pelo contactsData original.
// Estado vazio: o objeto embrulhado, não `[]` — quem lê desembrulha
// `.colaboradores` logo abaixo, e o padrão precisa ter o mesmo formato do que
// está gravado no banco para os dois caminhos coincidirem.
const VAZIO = { colaboradores: [] }

export async function getContatos() {
  const data = await kvGet(DATA_KEY, { padrao: VAZIO })
  return data?.colaboradores ?? []
}

// Igual a getContatos, mas inclui o `updated_at` da linha e já desembrulha
// `colaboradores` — ver getAssetsWithMeta.
export async function getContatosWithMeta() {
  const { value, updatedAt } = await kvGetWithMeta(DATA_KEY, { padrao: VAZIO })
  return { value: value?.colaboradores ?? [], updatedAt }
}

// Grava a lista completa de colaboradores, reembrulhada em `{ colaboradores }`
// para preservar exatamente o formato já existente no banco.
// `expectedUpdatedAt`: gravação condicional (compare-and-swap) — ver kvSet.
export async function saveContatos(colaboradores, expectedUpdatedAt) {
  await kvSet(DATA_KEY, { colaboradores }, { expectedUpdatedAt })
}
