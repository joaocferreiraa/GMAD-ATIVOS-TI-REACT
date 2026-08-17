import GaugeChart from '../../charts/GaugeChart/GaugeChart'
import { DEFAULT_THRESHOLDS } from '../../../constants/monitoramento'
import { escalaLatencia, statsDe } from '../../../utils/hostFormatters'
import styles from './LiveGauges.module.css'

// Quantos pontos a sparkline de tendência usa. 40 é o suficiente pra
// enxergar a forma recente sem virar um gráfico cheio (o gráfico completo
// está logo abaixo, no mesmo card).
const TREND_POINTS = 40

// Últimos N valores de uma métrica, pra sparkline de tendência.
function trendDe(lista, campo) {
  return lista.slice(-TREND_POINTS).map((m) => {
    const v = m[campo]
    return v === undefined ? null : v
  })
}

// Trio de velocímetros com a leitura ATUAL do ponto selecionado: latência,
// perda de pacotes e disponibilidade da janela recente. O gráfico de linha
// ao lado mostra a evolução; aqui é o "agora", legível de relance — a
// mesma divisão que Grafana/Zabbix fazem entre gauge e série temporal.
//
// Cada gauge traz também os indicadores daqueles painéis: escala numerada,
// marcador do limite configurado, mín/méd/máx da janela e sparkline de
// tendência (ver GaugeChart).
//
// As faixas coloridas saem dos limites configurados NO PRÓPRIO PONTO (ver
// MonitorFormModal), não de números fixos: 80ms é excelente num link de
// internet e ruim num switch local, então o mesmo valor pode sair verde num
// ponto e vermelho noutro.
export default function LiveGauges({ monitor, measurements }) {
  if (!monitor) return null

  const t = { ...DEFAULT_THRESHOLDS, ...(monitor.thresholds || {}) }
  const lista = measurements ?? []

  // A lista pode vir crua (uma linha por ping, com `disponivel`) ou
  // agregada por intervalo em períodos longos (ver useMonitorHistory), que
  // não tem `disponivel` e sim `disponibilidadePct` já calculada. Os dois
  // formatos precisam funcionar porque o seletor de período do card manda
  // nos dois.
  const agregado = lista.length > 0 && lista[0].disponibilidadePct !== undefined

  // Última medição VÁLIDA (com o ponto no ar): num ponto offline, a última
  // linha não tem latência — mostrar "—" seria correto mas esconderia o
  // último valor conhecido, então preferimos o último número real medido e
  // deixamos a disponibilidade denunciar a queda.
  const ultimaValida = [...lista]
    .reverse()
    .find((m) => (agregado ? m.latenciaMs !== null : m.disponivel !== false))
  const latencia = ultimaValida?.latenciaMs ?? null
  const perda = ultimaValida?.packetLossPct ?? null

  // Disponibilidade da janela carregada (não de uma única medição, que
  // seria sempre 0% ou 100%) — mesma definição do resumo por intervalo.
  // No agregado, é a média das disponibilidades já calculadas por bucket.
  let disponibilidade = null
  if (agregado) {
    const pcts = lista.map((m) => m.disponibilidadePct).filter((v) => v !== null && v !== undefined)
    disponibilidade = pcts.length
      ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100) / 100
      : null
  } else if (lista.length) {
    disponibilidade =
      Math.round((lista.filter((m) => m.disponivel !== false).length / lista.length) * 10000) / 100
  }

  const maxLatencia = escalaLatencia(t.latenciaMaximaMs)
  // Escala da perda: o limite costuma ser baixo (2%), então uma escala de
  // 0-100% deixaria a agulha imóvel no canto. 5x o limite dá movimento
  // visível, com teto de 100 (é uma porcentagem).
  const maxPerda = Math.min(Math.max(t.packetLossMaximoPct * 5, 10), 100)

  // A tendência de disponibilidade só existe no formato agregado (cada
  // bucket tem um %); no cru, cada medição é 0 ou 100 e a linha viraria uma
  // onda quadrada sem informação.
  const trendDisponibilidade = agregado ? trendDe(lista, 'disponibilidadePct') : null

  return (
    <div className={styles.row}>
      <GaugeChart
        value={latencia}
        max={maxLatencia}
        unidade="ms"
        label="Latência atual"
        limite={t.latenciaMaximaMs}
        stats={statsDe(lista, 'latenciaMs')}
        trend={trendDe(lista, 'latenciaMs')}
        zones={[
          { ate: t.latenciaMaximaMs, color: 'var(--ok)' },
          { ate: t.latenciaMaximaMs * 2, color: 'var(--warn)' },
          { ate: maxLatencia, color: 'var(--danger)' },
        ]}
      />
      <GaugeChart
        value={perda}
        max={maxPerda}
        unidade="%"
        label="Perda de pacotes"
        limite={t.packetLossMaximoPct}
        stats={statsDe(lista, 'packetLossPct')}
        trend={trendDe(lista, 'packetLossPct')}
        zones={[
          { ate: t.packetLossMaximoPct, color: 'var(--ok)' },
          { ate: t.packetLossMaximoPct * 2, color: 'var(--warn)' },
          { ate: maxPerda, color: 'var(--danger)' },
        ]}
      />
      <GaugeChart
        value={disponibilidade}
        max={100}
        unidade="%"
        label="Disponibilidade"
        stats={agregado ? statsDe(lista, 'disponibilidadePct') : null}
        trend={trendDisponibilidade}
        // Maior é melhor: as zonas vão de vermelho (baixo) a verde (alto) —
        // o inverso das duas de cima.
        zones={[
          { ate: 90, color: 'var(--danger)' },
          { ate: 99, color: 'var(--warn)' },
          { ate: 100, color: 'var(--ok)' },
        ]}
      />
    </div>
  )
}
