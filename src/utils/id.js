import { ID_PREFIX } from '../constants/fieldGroups'
import { unitIdPrefix } from './units'

// Identificador interno único (uid) — igual ao uid() original.
export function uid() {
  return 'a' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

// Prefixo completo do ID: "DSK" na Madville, "CWB-DSK" em Curitiba. É ele
// que separa as numerações — cada prefixo é uma sequência independente, e
// como os prefixos não se sobrepõem, os IDs continuam únicos no sistema
// inteiro (que é o que useAssetMutations, o vínculo de chamado e o
// casamento com o inventário do agente exigem).
export function idPrefixFor(categoria, unidade) {
  const daCategoria = ID_PREFIX[categoria]
  if (!daCategoria) return null
  const daUnidade = unitIdPrefix(unidade)
  return daUnidade ? `${daUnidade}-${daCategoria}` : daCategoria
}

// Próximo ID sequencial para uma categoria na unidade (ex.: DSK-0030,
// CWB-DSK-0005).
//
// A varredura é por PREFIXO, não por unidade nem por categoria do registro:
// o prefixo já identifica a sequência, e olhar todos os ativos que o usam é
// o que garante que o número novo não esbarre em nenhum ID existente — nem
// no de outra unidade Madville, nem no de um ativo cuja categoria foi
// trocada depois do cadastro sem o ID acompanhar.
export function nextIdFor(assets, categoria, unidade) {
  const prefix = idPrefixFor(categoria, unidade)
  if (!prefix) return ''
  const sequencial = new RegExp(`^${prefix}-(\\d+)$`)
  const nums = assets
    .map((a) => sequencial.exec(String(a.id || '').toUpperCase())?.[1])
    .filter(Boolean)
    .map((n) => parseInt(n, 10))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}
