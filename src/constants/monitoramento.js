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

export const HISTORICO_PERIODOS = [
  { value: '15m', label: 'Últimos 15 minutos', minutes: 15 },
  { value: '30m', label: 'Últimos 30 minutos', minutes: 30 },
  { value: '1h', label: 'Última hora', minutes: 60 },
  { value: '6h', label: 'Últimas 6 horas', minutes: 360 },
  { value: '24h', label: 'Últimas 24 horas', minutes: 1440 },
  { value: '7d', label: 'Últimos 7 dias', minutes: 10080 },
  { value: '30d', label: 'Últimos 30 dias', minutes: 43200 },
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
