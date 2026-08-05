import { kvGet, kvSet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_contatos_v1'

// Lê a lista de colaboradores do kv_store — o valor gravado é um objeto
// `{ colaboradores: [...] }` (não um array puro, ao contrário de Ativos),
// mesmo formato usado pelo contactsData original.
export async function getContatos() {
  const data = await kvGet(DATA_KEY)
  return data?.colaboradores ?? []
}

// Grava a lista completa de colaboradores, reembrulhada em `{ colaboradores }`
// para preservar exatamente o formato já existente no banco.
export async function saveContatos(colaboradores) {
  await kvSet(DATA_KEY, { colaboradores })
}
