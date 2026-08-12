// Lógica de agrupamento/filtro por unidade, portada do sistema original
// (isMadvilleUnit, matchesUnitValue, getUnidades) — pura, sem UI.

export const MADVILLE_GROUP = '__madville__'

export function isMadvilleUnit(unit) {
  return /^Madville/i.test(unit || '')
}

export function matchesUnitValue(unit, filterValue) {
  if (filterValue === 'Todas') return true
  if (filterValue === MADVILLE_GROUP) return isMadvilleUnit(unit)
  return unit === filterValue
}

// Lista de unidades distintas presentes nos ativos, com as unidades Madville
// primeiro (ordem alfabética dentro de cada grupo).
export function getUnidades(assets) {
  const set = new Set(assets.map((a) => a.unidade).filter(Boolean))
  return Array.from(set).sort((a, b) => {
    const ma = isMadvilleUnit(a)
    const mb = isMadvilleUnit(b)
    if (ma !== mb) return ma ? -1 : 1
    return a.localeCompare(b, 'pt-BR')
  })
}

export function getDepartamentos(scoped) {
  const set = new Set(scoped.map((a) => a.departamento).filter(Boolean))
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
