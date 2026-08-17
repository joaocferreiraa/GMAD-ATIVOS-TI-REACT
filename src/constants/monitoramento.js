// Listas fixas do módulo de Monitoramento de Rede — mesmo padrão de
// constants/stock.js.

export const MONITOR_TIPOS = [
  'Servidor',
  'Roteador',
  'Access Point',
  'Wi-Fi',
  'Link de internet',
  'Switch',
  'Outro',
]

// Limites padrão sugeridos ao cadastrar um novo ponto — sempre editáveis por
// ponto (ver campos limite* em MonitorFormModal). Nenhum desses valores é
// usado para inventar uma medição: eles só classificam medições reais já
// coletadas (ver utils/networkStatus.js).
export const DEFAULT_THRESHOLDS = {
  latenciaMaximaMs: 100,
  packetLossMaximoPct: 2,
  downloadMinimoMbps: 0,
  uploadMinimoMbps: 0,
  falhasConsecutivasLimite: 3,
}

export const DEFAULT_INTERVALO_SEGUNDOS = 30

// Teto de itens em listas "recentes" de alertas — usado tanto na tela
// principal (MonitoramentoRedePage) quanto na ficha de um ponto
// (MonitorViewModal), pra ficarem sempre em sincronia sem duplicar o número
// mágico nos dois lugares.
export const ALERTS_PREVIEW_LIMIT = 8

export const HISTORICO_PERIODOS = [
  { value: '15m', label: 'Últimos 15 minutos', minutes: 15 },
  { value: '30m', label: 'Últimos 30 minutos', minutes: 30 },
  { value: '1h', label: 'Última hora', minutes: 60 },
  { value: '6h', label: 'Últimas 6 horas', minutes: 360 },
  { value: '24h', label: 'Últimas 24 horas', minutes: 1440 },
  { value: '7d', label: 'Últimos 7 dias', minutes: 10080 },
  { value: '30d', label: 'Últimos 30 dias', minutes: 43200 },
]

// Tamanho do intervalo de agregação por período (ver
// services/monitoramento/measurementsService.js → getBucketedMeasurements).
// Escolhidos pra cada período render ~100-360 pontos no gráfico
// independente de quantas medições existem por trás: resolução suficiente
// pra enxergar a forma da curva, leve o bastante pro navegador desenhar.
// Períodos curtos (<= 1h) não agregam nada (bucket null = medições cruas),
// porque aí o volume já é pequeno e cada ping individual importa.
export const BUCKET_SEGUNDOS_POR_PERIODO = {
  '15m': null,
  '30m': null,
  '1h': null,
  '6h': 300, // 5 min  -> 72 pontos
  '24h': 900, // 15 min -> 96 pontos
  '7d': 3600, // 1 hora -> 168 pontos
  '30d': 14400, // 4 horas -> 180 pontos
}

// Métricas disponíveis no gráfico comparativo (várias séries sobrepostas).
// Subconjunto de METRICA_OPTIONS: só o que o agente coleta continuamente
// pra TODOS os pontos. Download/upload ficam de fora porque vêm do teste de
// velocidade manual (origem 'navegador'), que não roda por ponto nem em
// intervalo fixo — sobrepor isso a séries de ping compararia coisas
// medidas de formas diferentes.
export const METRICA_COMPARACAO_OPTIONS = [
  { value: 'latenciaMs', label: 'Latência', unidade: 'ms' },
  { value: 'packetLossPct', label: 'Packet Loss', unidade: '%' },
  { value: 'disponibilidadePct', label: 'Disponibilidade', unidade: '%' },
]

// Paleta das séries do gráfico comparativo — cores do tema (ver styles/
// tokens), na ordem em que os pontos aparecem. Distinguíveis entre si no
// claro e no escuro; acima de 6 pontos a paleta repete (o nome na legenda
// continua desambiguando).
export const SERIE_CORES = [
  'var(--brand)',
  'var(--danger)',
  'var(--warn)',
  'var(--ok)',
  'var(--accent)',
  'var(--brand-strong)',
]

export const METRICA_OPTIONS = [
  { value: 'downloadMbps', label: 'Download', unidade: 'Mbps' },
  { value: 'uploadMbps', label: 'Upload', unidade: 'Mbps' },
  { value: 'latenciaMs', label: 'Latência', unidade: 'ms' },
  { value: 'jitterMs', label: 'Jitter', unidade: 'ms' },
  { value: 'packetLossPct', label: 'Packet Loss', unidade: '%' },
]

// origem da medição: 'navegador' (teste de velocidade manual, rodado no
// navegador de quem está usando o painel) ou 'agente' (agente local rodando
// dentro da rede da GMAD — ver agent/README.md).
export const MEDICAO_ORIGENS = ['navegador', 'agente']
