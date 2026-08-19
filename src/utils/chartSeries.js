import { SERIE_CORES } from '../constants/monitoramento'

// Transforma medições (uma linha por ponto+instante, formato "longo") no
// formato "largo" que o Recharts precisa pra alinhar várias séries no mesmo
// eixo X: uma linha por instante, com uma coluna por ponto monitorado.
//
//   entrada:  [{ monitorUid: 'a', createdAt: T1, latenciaMs: 12 },
//              { monitorUid: 'b', createdAt: T1, latenciaMs: 30 }]
//   saída:    [{ bucket: T1, a: 12, b: 30 }]
//
// Instantes em que um ponto não tem medição ficam com a coluna AUSENTE, que
// o Recharts trata como buraco na linha — nunca preenchida com 0 ou com o
// valor anterior, que seria inventar um dado que não foi medido.
export function toWideSeries(measurements, metric) {
  const byBucket = new Map()
  for (const m of measurements) {
    if (!m.monitorUid) continue
    const key = m.createdAt
    if (!byBucket.has(key)) byBucket.set(key, { bucket: key })
    const value = m[metric]
    byBucket.get(key)[m.monitorUid] = value === undefined ? null : value
  }
  return Array.from(byBucket.values()).sort((a, b) => new Date(a.bucket) - new Date(b.bucket))
}

// Descritor de série (key/label/cor) por ponto monitorado, na ordem em que
// os pontos foram passados — cor estável por posição, então trocar de
// métrica ou de período não embaralha a legenda.
//
// TODAS AS LINHAS CONTÍNUAS, por decisão visual. Cada série já teve um
// padrão de traço próprio, e ele resolvia um problema real: quando dois
// pontos têm o MESMO valor (o caso comum — todos em 0% de perda, todos em
// 100% de disponibilidade), as linhas se sobrepõem exatamente e só a última
// desenhada aparece, como se uma série tivesse sumido. Tracejadas
// diferentes se intercalavam e todas continuavam visíveis.
//
// Quem resolve isso agora é a ESPESSURA ESCALONADA do MultiLineChart (ver
// larguraDaSerie): cada série é desenhada um degrau mais fina que a
// anterior, então onde coincidem aparecem faixas de cor aninhadas em vez de
// uma linha só. Vale sem mouse, o que importa no Modo TV. O tooltip e a
// tabela de resumo seguem como a leitura exata.
//
// `dash` continua sendo prop aceita pelo MultiLineChart, caso um dia se
// queira o reforço do tracejado de volta.
export function buildSeries(monitors) {
  return monitors.map((m, i) => ({
    key: m.uid,
    label: m.nome,
    color: SERIE_CORES[i % SERIE_CORES.length],
  }))
}

// Estatísticas por série (mín/méd/máx/último) — o resumo que o Zabbix
// mostra embaixo de cada gráfico, e que responde "esse pico foi alto?" sem
// precisar passar o mouse ponto a ponto. Ignora buracos (null): eles são
// ausência de medição, não zero.
export function seriesStats(wideData, series) {
  return series.map((s) => {
    const valores = wideData
      .map((d) => d[s.key])
      .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
    if (!valores.length) {
      return { ...s, min: null, avg: null, max: null, ultimo: null }
    }
    const soma = valores.reduce((acc, v) => acc + v, 0)
    return {
      ...s,
      min: Math.min(...valores),
      avg: Math.round((soma / valores.length) * 100) / 100,
      max: Math.max(...valores),
      ultimo: valores[valores.length - 1],
    }
  })
}
