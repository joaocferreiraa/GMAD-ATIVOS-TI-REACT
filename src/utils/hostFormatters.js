// Formatação das métricas de host (ver hooks/data/useHostMetrics.js).
// Separado de utils/formatters.js pra não misturar com a formatação dos
// domínios de negócio (ativos, contatos, garantia...).

const UNIDADES = ['B', 'KiB', 'MiB', 'GiB', 'TiB']

// Bytes em unidade legível. Base 1024 (mesma que Windows/Zabbix usam pra
// memória e disco), então "16 GiB" bate com o que o sistema operacional
// mostra. null vira "—", nunca 0.
export function fmtBytes(bytes, casas = 1) {
  if (bytes === null || bytes === undefined || Number.isNaN(bytes)) return '—'
  if (bytes === 0) return '0 B'
  const i = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), UNIDADES.length - 1)
  const valor = bytes / 1024 ** i
  // Unidades pequenas (B/KiB) não precisam de decimal; GiB sim.
  return `${i <= 1 ? Math.round(valor) : valor.toFixed(casas)} ${UNIDADES[i]}`
}

// Uptime em texto curto, no estilo do card "Host uptime" do Grafana:
// a maior unidade relevante ("2 semanas", "3 dias", "5 h"), não uma
// contagem exaustiva de dias/horas/minutos.
export function fmtUptime(segundos) {
  if (segundos === null || segundos === undefined || Number.isNaN(segundos)) return '—'
  const min = Math.floor(segundos / 60)
  if (min < 60) return `${min} min`
  const horas = Math.floor(min / 60)
  if (horas < 24) return `${horas} h`
  const dias = Math.floor(horas / 24)
  if (dias < 14) return dias === 1 ? '1 dia' : `${dias} dias`
  const semanas = Math.floor(dias / 7)
  if (semanas < 9) return semanas === 1 ? '1 semana' : `${semanas} semanas`
  const meses = Math.floor(dias / 30)
  return meses === 1 ? '1 mês' : `${meses} meses`
}

// Porcentagem com no máximo uma casa, sem forçar ".0" em número redondo.
export function fmtPct(v) {
  if (v === null || v === undefined || Number.isNaN(v)) return '—'
  return `${Math.round(v * 10) / 10}%`
}

// Percentil de uma série — p95 por padrão. Em monitoramento de rede o
// percentil diz mais que a média: uma média de 13ms com p95 de 80ms
// significa picos intermitentes que a média esconde e que o usuário sente
// (chamada travando, sistema "lento às vezes"). É o número que a operação
// de rede acompanha, não a média.
//
// Usa interpolação linear entre as duas amostras vizinhas (mesmo método
// "linear" do NumPy/Excel), pra série curta não pular degraus.
export function percentil(valores, p = 95) {
  const vals = (valores ?? [])
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
    .sort((a, b) => a - b)
  if (!vals.length) return null
  if (vals.length === 1) return Math.round(vals[0] * 100) / 100
  const idx = (p / 100) * (vals.length - 1)
  const baixo = Math.floor(idx)
  const alto = Math.ceil(idx)
  const valor =
    baixo === alto ? vals[baixo] : vals[baixo] + (vals[alto] - vals[baixo]) * (idx - baixo)
  return Math.round(valor * 100) / 100
}

// Estatísticas de latência no formato que a operação de rede usa: além de
// mín/méd/máx, o p95 (ver percentil acima).
export function statsLatencia(lista, campo = 'latenciaMs') {
  const vals = (lista ?? [])
    .map((m) => m[campo])
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
  if (!vals.length) return null
  const soma = vals.reduce((a, b) => a + b, 0)
  return {
    min: Math.round(Math.min(...vals) * 100) / 100,
    avg: Math.round((soma / vals.length) * 100) / 100,
    max: Math.round(Math.max(...vals) * 100) / 100,
    p95: percentil(vals, 95),
  }
}

// Cor semântica por faixa de uso (CPU/memória/disco): o mesmo verde/
// amarelo/vermelho que Zabbix e Grafana usam pra saturação de recurso.
// `limites` permite ajustar por métrica — disco costuma alarmar mais cedo
// que CPU, porque encher o disco derruba serviço.
export function usoTone(pct, limites = { warn: 75, danger: 90 }) {
  if (pct === null || pct === undefined || Number.isNaN(pct)) return 'none'
  if (pct >= limites.danger) return 'danger'
  if (pct >= limites.warn) return 'warn'
  return 'ok'
}
