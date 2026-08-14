import { DEFAULT_INTERVALO_SEGUNDOS, DEFAULT_THRESHOLDS } from '../constants/monitoramento'

// Infraestrutura guarda `unidade` no formato "cru" de INFRA_UNIT_NAMES (ver
// constants/infra.js) — ex: 'Madville Loja', 'GMAD Curitiba' — enquanto
// Ativos/Monitoramento usam o formato canônico com parênteses (ver
// getUnidades() em utils/units.js e UNIT_ORDER em
// pages/MonitoramentoRedePage/useMonitoramentoData.js): 'Madville (Loja)',
// 'Gmad Curitiba'. Sem esse mapa, um ponto importado ficaria com uma
// `unidade` que o filtro/agrupamento por unidade de Monitoramento não
// reconhece (nem aparece nas opções do filtro, nem agrupa com o resto da
// mesma unidade).
const INFRA_UNIT_TO_CANONICAL = {
  'Madville Loja': 'Madville (Loja)',
  'Madville CD': 'Madville (CD)',
  'Madville Soluções': 'Madville (Soluções)',
  'GMAD Curitiba': 'Gmad Curitiba',
}

function canonicalUnit(unidade) {
  return INFRA_UNIT_TO_CANONICAL[unidade] || unidade
}

// Primeiro valor não-vazio (já sem espaços) entre os campos de IP
// informados, na ordem dada — trim ANTES de checar se está vazio, pra um
// campo só com espaço em branco não vencer um IP de verdade mais abaixo na
// prioridade.
function firstNonEmpty(...values) {
  for (const v of values) {
    const trimmed = (v || '').trim()
    if (trimmed) return trimmed
  }
  return ''
}

// Monta a lista de candidatos a importar de Infraestrutura (Wi-Fi e
// Construshow) pro Monitoramento de Rede — cada rede Wi-Fi vira um ponto
// (host = gateway, é o equipamento que representa a saúde daquela rede,
// com fallback pro IP Interno/Externo se não houver gateway cadastrado) e
// cada unidade Construshow vira um ponto (host = IP Externo, é a
// dependência de internet que costuma falhar primeiro, com fallback pro IP
// Interno). Entradas sem nenhum IP cadastrado não têm o que pingar, então
// ficam de fora. Entradas cujo host já está cadastrado em algum ponto
// monitorado (mesmo host, comparação case-insensitive) vêm marcadas como
// já importadas, pra não duplicar.
export function buildImportCandidates(infra, monitores) {
  const existingHosts = new Set(
    (monitores || []).map((m) => (m.host || '').trim().toLowerCase()).filter(Boolean),
  )

  const wifiItems = (infra?.wifi || [])
    .map((w, idx) => ({
      key: `wifi-${idx}`,
      origem: 'wifi',
      nome: w.redeNome ? `Wi-Fi ${w.redeNome} - ${w.unidade}` : `Wi-Fi ${w.unidade}`,
      host: firstNonEmpty(w.gateway, w.ipInterno, w.ipExterno),
      tipo: 'Wi-Fi',
      unidade: canonicalUnit(w.unidade),
    }))
    .filter((c) => c.host)

  const construshowItems = (infra?.construshow || [])
    .map((c, idx) => ({
      key: `construshow-${idx}`,
      origem: 'construshow',
      nome: `Construshow - ${c.unidade}`,
      host: firstNonEmpty(c.ipExterno, c.ipInterno),
      tipo: 'Servidor',
      unidade: canonicalUnit(c.unidade),
    }))
    .filter((c) => c.host)

  return [...wifiItems, ...construshowItems].map((c) => ({
    ...c,
    jaMonitorado: existingHosts.has(c.host.toLowerCase()),
  }))
}

// Converte um candidato selecionado no registro que useMonitorMutations()
// espera (mesmo formato produzido por MonitorFormModal) — limites e
// intervalo ficam no padrão, editáveis depois como qualquer outro ponto.
export function candidateToMonitorRecord(candidate) {
  return {
    nome: candidate.nome,
    host: candidate.host,
    tipo: candidate.tipo,
    unidade: candidate.unidade,
    descricao: 'Importado de Infraestrutura',
    intervaloSegundos: DEFAULT_INTERVALO_SEGUNDOS,
    ativo: true,
    thresholds: { ...DEFAULT_THRESHOLDS },
  }
}
