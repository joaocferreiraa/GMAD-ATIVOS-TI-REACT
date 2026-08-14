import { CONSTRUSHOW_FIELDS, INFRA_UNIT_NAMES, WIFI_FIELDS } from '../constants/infra'

// Campos de Wi-Fi usados na BUSCA — todos exceto os mascarados (`senha`).
// Incluir a senha aqui deixava a busca funcionar como um "oráculo": digitar
// um trecho da senha e ver se o card continua na lista revelava se aquele
// trecho está certo, sem precisar clicar no botão de mostrar. `WIFI_FIELDS`
// em si continua intocado — ainda é usado pra EXIBIR todos os campos.
const WIFI_SEARCHABLE_FIELDS = WIFI_FIELDS.filter((f) => !f.masked)

function infraNorm(s) {
  return String(s || '').toLowerCase()
}

function infraRowMatches(label, value, q) {
  return infraNorm(label).includes(q) || infraNorm(value).includes(q)
}

function infraFieldsMatch(fieldDefs, data, q) {
  return fieldDefs.some((f) => infraRowMatches(f.label, data[f.key], q))
}

// Registros de Construshow que casam com a busca (ou todos, se vazia),
// junto com o índice original em infraData.construshow — equivalente à
// parte de filtragem de infraBuildConstrushowSection() original.
export function filterConstrushow(list, search) {
  const q = infraNorm(search).trim()
  const titleMatches = infraNorm('Construshow').includes(q)
  return (list || [])
    .map((c, idx) => ({ c, idx }))
    .filter(
      ({ c }) =>
        !q ||
        titleMatches ||
        infraNorm(c.unidade).includes(q) ||
        infraFieldsMatch(CONSTRUSHOW_FIELDS, c, q),
    )
}

// Redes Wi-Fi agrupadas por unidade (ordem de INFRA_UNIT_NAMES), filtradas
// pela busca — equivalente à parte de filtragem/agrupamento de
// infraBuildWifiSection() original. Cada grupo é { unidade, items:
// [{w, idx}] }.
export function groupWifi(list, search) {
  const q = infraNorm(search).trim()
  const titleMatches = infraNorm('Wi-Fi').includes(q)
  const entries = (list || [])
    .map((w, idx) => ({ w, idx }))
    .filter(({ w }) => w.unidade !== 'GMAD Madville')

  const groupsMap = new Map()
  entries.forEach((e) => {
    if (!groupsMap.has(e.w.unidade)) groupsMap.set(e.w.unidade, [])
    groupsMap.get(e.w.unidade).push(e)
  })
  const unidades = Array.from(groupsMap.keys()).sort(
    (a, b) => INFRA_UNIT_NAMES.indexOf(a) - INFRA_UNIT_NAMES.indexOf(b),
  )

  return unidades
    .map((unidade) => ({ unidade, items: groupsMap.get(unidade) }))
    .filter(
      ({ unidade, items }) =>
        !q ||
        titleMatches ||
        infraNorm(unidade).includes(q) ||
        items.some(({ w }) => infraFieldsMatch(WIFI_SEARCHABLE_FIELDS, w, q)),
    )
}
