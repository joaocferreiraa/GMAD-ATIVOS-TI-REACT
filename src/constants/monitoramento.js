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

// Paleta das séries dos gráficos temporais (comparativo, painel e modo TV)
// — a paleta de gráficos do tema (--chart-*, ver styles/tokens.css), na
// ordem em que os pontos aparecem. Acima de 6 pontos repete (o nome na
// legenda continua desambiguando).
//
// Azul vivo na frente e matizes bem separados: estas linhas precisam ser
// lidas a metros de distância num monitor de parede, e os verdes escuros da
// marca (--brand/--brand-strong, usados antes) se confundiam entre si e com
// a grade do gráfico.
//
// A ORDEM aqui é o que mais importa, e não é a mesma de CHART_COLORS. Numa
// paleta de barras o que separa duas cores é a barra vizinha; aqui as
// linhas se cruzam e se sobrepõem o gráfico inteiro, então cada cor precisa
// estar longe da anterior NA RODA DE CORES, não só ser diferente. Como a
// instalação típica tem 2-4 pontos, as primeiras posições carregam o peso:
// azul (221°) → âmbar (37°) → violeta (277°). Azul e âmbar estão a 176° de
// distância, de um máximo teórico de 180: as duas séries que quase sempre
// aparecem juntas ficam praticamente uma no lado oposto da outra.
//
// O CIANO desceu do 2º pro 4º lugar justamente por isso: colado no azul da
// primeira série, e ainda por cima tracejado, as duas linhas viravam a
// mesma coisa a poucos metros. Da 4ª série em diante já não há matiz
// sobrando, e aí o padrão de traço é que separa.
//
// VERMELHO ficou de fora, ainda que seja a cor mais chamativa da paleta:
// nestes gráficos o vermelho já significa "limite estourado" (as linhas
// tracejadas de threshold, ver MultiLineChart), e uma série vermelha
// permanente faria um link saudável parecer um alarme. O rosa é o vizinho
// mais próximo desse vermelho, então fica em último — é o único que só
// aparece se houver 6 pontos monitorados.
//
// VERDE ficou de fora por escolha visual. Nada impede tecnicamente (nenhum
// elemento dentro da área de desenho é verde), mas com ele fora daqui a cor
// deixa de acumular dois papéis na mesma tela: nos gráficos seria
// identidade de um ponto, e nos cartões e no cabeçalho ela continua
// significando "tudo certo". O verde-lima da 5ª posição é outro matiz
// (80° contra 145°) e não carrega essa leitura.
//
// O ÂMBAR da 2ª posição é quase o mesmo tom de --warn, que nos cartões de
// medição significa "acima do limite" — as duas codificações convivem na
// tela do Modo TV. O que as separa não é a cor, é a FORMA da legenda:
// quadrado preenchido para estado, traço tracejado para série. Ver a nota
// em --chart-2 (styles/tokens.css) se um dia isso confundir na parede.
export const SERIE_CORES = [
  'var(--chart-1)', // azul
  'var(--chart-2)', // âmbar
  'var(--chart-4)', // violeta
  'var(--chart-3)', // ciano
  'var(--chart-7)', // verde-lima
  'var(--chart-6)', // rosa
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
