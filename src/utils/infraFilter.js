import { CONSTRUSHOW_FIELDS, INFRA_UNIT_NAMES, WIFI_FIELDS } from '../constants/infra'

// Campos de Wi-Fi usados na BUSCA — todos exceto os mascarados (`senha`).
// Incluir a senha aqui deixava a busca funcionar como um "oráculo": digitar
// um trecho da senha e ver se o card continua na lista revelava se aquele
// trecho está certo, sem precisar clicar no botão de mostrar. `WIFI_FIELDS`
// em si continua intocado — ainda é usado pra EXIBIR todos os campos.
const WIFI_SEARCHABLE_FIELDS = WIFI_FIELDS.filter((f) => !f.masked)

// Campos que contam como PENDÊNCIA quando vazios. `observacoes` fica de
// fora: é campo livre, e vazio ali é o estado normal — contá-lo faria o
// painel acusar pendência em toda rede perfeitamente cadastrada.
const WIFI_REQUIRED_FIELDS = WIFI_FIELDS.filter((f) => f.key !== 'observacoes')

// Unidade guarda-chuva: agrupa as demais, não é um local físico com rede
// própria. Tem Construshow (por isso aparece na tela), mas Wi-Fi não —
// o sistema original já escondia as redes dela, e aqui o bloco inteiro de
// Wi-Fi some, inclusive o botão "Nova rede": oferecer o botão convidaria a
// criar exatamente o registro que esta regra existe pra evitar.
const UNIDADE_SEM_WIFI = 'GMAD Madville'

// Palavras que descrevem as SEÇÕES, não um campo: buscar "wifi" ou
// "construshow" continua fazendo sentido mesmo agora que a tela é dividida
// por unidade, e casa com todas elas (toda unidade tem os dois blocos).
const SECAO_KEYWORDS = ['Wi-Fi', 'Construshow']

function infraNorm(s) {
  return String(s || '').toLowerCase()
}

function infraRowMatches(label, value, q) {
  return infraNorm(label).includes(q) || infraNorm(value).includes(q)
}

function infraFieldsMatch(fieldDefs, data, q) {
  return fieldDefs.some((f) => infraRowMatches(f.label, data[f.key], q))
}

function vazio(v) {
  return v === undefined || v === null || String(v).trim() === ''
}

// Posição da unidade na ordem canônica. Um nome fora de INFRA_UNIT_NAMES vai
// pro FIM: o `indexOf` cru devolve -1, o que jogava uma unidade
// desconhecida (nome digitado diferente, unidade nova ainda não registrada
// na constante) pra ANTES das unidades reais, no topo da tela.
function unitOrder(unidade) {
  const i = INFRA_UNIT_NAMES.indexOf(unidade)
  return i === -1 ? INFRA_UNIT_NAMES.length : i
}

// Infraestrutura agrupada por UNIDADE — um bloco por local, com as redes
// Wi-Fi e o Construshow daquele local juntos.
//
// Este é o eixo que a tela usa hoje. Antes ela era dividida por SISTEMA
// (uma seção Wi-Fi e uma seção Construshow, cada uma listando as unidades
// por dentro), o que obrigava a abrir e fechar duas vezes pra montar a
// resposta de "quais são os dados da Loja?" — e o acordeão só deixava uma
// seção aberta por vez, então os dois nunca ficavam visíveis juntos. Quem
// consulta esta tela parte da unidade, não do sistema.
//
// Cada bloco é { unidade, aceitaWifi, wifi: [{w, idx}], construshow:
// {c, idx}|null }. Os `idx` são as posições nos arrays originais de
// infraData — é por eles que as mutações localizam o registro, então
// precisam sobreviver ao filtro.
export function buildInfraByUnit(infra, search) {
  const q = infraNorm(search).trim()
  const secaoMatch = !!q && SECAO_KEYWORDS.some((k) => infraNorm(k).includes(q))

  const wifi = (infra?.wifi || [])
    .map((w, idx) => ({ w, idx }))
    .filter(({ w }) => w.unidade !== UNIDADE_SEM_WIFI)
  const construshow = (infra?.construshow || []).map((c, idx) => ({ c, idx }))

  // União das unidades das duas coleções: uma unidade que só tem Construshow
  // (ou só Wi-Fi) precisa aparecer assim mesmo, com o bloco que falta
  // convidando ao cadastro em vez de sumir da tela.
  const nomes = []
  const vistos = new Set()
  for (const nome of [...wifi.map((e) => e.w.unidade), ...construshow.map((e) => e.c.unidade)]) {
    if (!nome || vistos.has(nome)) continue
    vistos.add(nome)
    nomes.push(nome)
  }
  nomes.sort((a, b) => unitOrder(a) - unitOrder(b))

  return nomes
    .map((unidade) => ({
      unidade,
      aceitaWifi: unidade !== UNIDADE_SEM_WIFI,
      wifi: wifi.filter((e) => e.w.unidade === unidade),
      construshow: construshow.find((e) => e.c.unidade === unidade) ?? null,
    }))
    .filter((bloco) => {
      if (!q || secaoMatch) return true
      if (infraNorm(bloco.unidade).includes(q)) return true
      if (bloco.wifi.some(({ w }) => infraFieldsMatch(WIFI_SEARCHABLE_FIELDS, w, q))) return true
      return !!bloco.construshow && infraFieldsMatch(CONSTRUSHOW_FIELDS, bloco.construshow.c, q)
    })
}

// Números do cabeçalho da tela. Contam o CADASTRO INTEIRO, não o resultado
// da busca: são a resposta pra "o que existe aqui?", que não muda porque
// alguém digitou algo no campo de busca.
//
// `pendentes` é o mais útil dos três — vira a lista de tarefas de quem
// mantém a tela. Um IP ou gateway em branco só é descoberto hoje abrindo
// unidade por unidade e lendo "Não informado" campo a campo.
export function infraStats(infra) {
  const wifi = (infra?.wifi || []).filter((w) => w.unidade !== UNIDADE_SEM_WIFI)
  const construshow = infra?.construshow || []

  const unidades = new Set(
    [...wifi.map((w) => w.unidade), ...construshow.map((c) => c.unidade)].filter(Boolean),
  )

  let pendentes = 0
  for (const w of wifi) {
    pendentes += WIFI_REQUIRED_FIELDS.filter((f) => vazio(w[f.key])).length
  }
  for (const c of construshow) {
    pendentes += CONSTRUSHOW_FIELDS.filter((f) => vazio(c[f.key])).length
  }

  return { unidades: unidades.size, redes: wifi.length, pendentes }
}
