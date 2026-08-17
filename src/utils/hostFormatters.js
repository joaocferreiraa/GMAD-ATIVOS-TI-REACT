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

// Escala do velocímetro de latência: sobe junto com o limite configurado do
// ponto, pra agulha não ficar sempre colada no início. Arredonda pra cima
// num múltiplo "redondo" (50/100/200...) só pra escala não ficar com
// números quebrados tipo 137. Compartilhado entre o card de tempo real
// (LiveGauges) e o painel de infraestrutura, pra um mesmo ponto ter a mesma
// escala nas duas telas.
export function escalaLatencia(limite) {
  const alvo = Math.max((limite ?? 100) * 2, 50)
  const passos = [50, 100, 200, 300, 500, 1000, 2000]
  return passos.find((p) => p >= alvo) ?? 2000
}

// mín/méd/máx de uma métrica numa lista de medições — o rodapé de
// estatística que o Zabbix mostra sob cada gráfico. Ignora null (ausência
// de medição não é zero).
export function statsDe(lista, campo) {
  const vals = (lista ?? [])
    .map((m) => m[campo])
    .filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
  if (!vals.length) return null
  const soma = vals.reduce((a, b) => a + b, 0)
  return {
    min: Math.round(Math.min(...vals) * 100) / 100,
    avg: Math.round((soma / vals.length) * 100) / 100,
    max: Math.round(Math.max(...vals) * 100) / 100,
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
