import { ID_PREFIX } from '../constants/fieldGroups'

// Identificador interno único (uid) — igual ao uid() original.
export function uid() {
  return 'a' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

// Próximo ID sequencial para uma categoria/unidade (ex.: DSK-0005).
export function nextIdFor(assets, categoria, unidade) {
  const prefix = ID_PREFIX[categoria]
  const nums = assets
    .filter(
      (a) => a.categoria === categoria && a.unidade === unidade && /^[A-Z]+-\d+$/.test(a.id || ''),
    )
    .map((a) => parseInt(a.id.split('-')[1], 10))
    .filter((n) => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}-${String(next).padStart(4, '0')}`
}
