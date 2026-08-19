// Lógica de agrupamento/filtro por unidade, portada do sistema original
// (isMadvilleUnit, matchesUnitValue, getUnidades) — pura, sem UI.

export const MADVILLE_GROUP = '__madville__'

export function isMadvilleUnit(unit) {
  return /^Madville/i.test(unit || '')
}

// Sigla que entra no ID do ativo das lojas de FORA da Madville, para cada
// região manter a numeração dela sem os IDs se confundirem.
//
// O ID do ativo é único no sistema inteiro (uniqueField: 'id' em
// useAssetMutations, e o vínculo de chamado e o casamento com o inventário
// do agente também assumem isso). Sem a sigla, "DSK-0001" da Loja e
// "DSK-0001" de Curitiba são o mesmo identificador para o sistema, e uma
// das duas lojas não consegue nem cadastrar o próximo equipamento.
//
// A Madville não tem sigla de propósito: é a sede, são as 60 e poucas
// máquinas já etiquetadas, e mudar o formato delas significaria reetiquetar
// e renomear o parque inteiro por nada.
export const UNIT_ID_PREFIX = {
  'Gmad Curitiba': 'CWB',
}

// Sigla derivada do nome, para uma loja nova que ainda não esteja no mapa
// acima — as iniciais das palavras. Não é bonito, mas é melhor do que o
// silêncio: sem prefixo nenhum a loja nova cairia direto na numeração da
// Madville. Ao cadastrar uma loja de verdade, dê a ela uma entrada
// explícita em UNIT_ID_PREFIX.
function siglaDerivada(unit) {
  const iniciais = String(unit)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
  return iniciais.slice(0, 4) || null
}

// Prefixo de unidade do ID do ativo, ou null quando o ID não leva sigla
// (Madville). As três unidades Madville devolvem null justamente porque
// compartilham uma sequência só — é o que impede DSK-0001 de existir na
// Loja e no CD ao mesmo tempo.
export function unitIdPrefix(unit) {
  if (!unit || isMadvilleUnit(unit)) return null
  return UNIT_ID_PREFIX[unit] ?? siglaDerivada(unit)
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
