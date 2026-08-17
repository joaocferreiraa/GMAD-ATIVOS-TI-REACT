import { useState } from 'react'
import Select from '../../ui/Select/Select'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import MultiLineChart from '../../charts/MultiLineChart/MultiLineChart'
import { useBucketedHistory } from '../../../hooks/data/useMedicoes'
import {
  HISTORICO_PERIODOS,
  METRICA_COMPARACAO_OPTIONS,
  BUCKET_SEGUNDOS_POR_PERIODO,
} from '../../../constants/monitoramento'
import { toWideSeries, buildSeries, seriesStats } from '../../../utils/chartSeries'
import panelStyles from '../MonitoramentoPanel.module.css'
import styles from './ComparativeChartCard.module.css'

// Períodos longos precisam da data no eixo/tooltip: "14:30" sozinho é
// ambíguo quando o gráfico cobre 30 dias.
const LONG_FORMAT_PERIODOS = ['24h', '7d', '30d']

// Gráfico comparativo: várias séries (uma por ponto monitorado) sobrepostas
// no mesmo eixo, com seletor de métrica/período, zoom por arrasto e um
// resumo mín/méd/máx/último por ponto — o equivalente ao painel que
// Grafana/Zabbix mostram, mantendo a estética do site.
//
// Em períodos longos os dados vêm agregados por intervalo direto do banco
// (ver getBucketedMeasurements), então "últimos 30 dias" abre com ~180
// pontos por série em vez de dezenas de milhares.
export default function ComparativeChartCard({ monitors }) {
  const [periodoValue, setPeriodoValue] = useState('6h')
  const [metric, setMetric] = useState('latenciaMs')
  // null = todos os pontos (estado inicial: a comparação é o ponto da tela).
  const [hiddenUids, setHiddenUids] = useState([])

  const periodo = HISTORICO_PERIODOS.find((p) => p.value === periodoValue) ?? HISTORICO_PERIODOS[3]
  const metricInfo =
    METRICA_COMPARACAO_OPTIONS.find((m) => m.value === metric) ?? METRICA_COMPARACAO_OPTIONS[0]
  const bucketSegundos = BUCKET_SEGUNDOS_POR_PERIODO[periodoValue] ?? null

  const visibleMonitors = monitors.filter((m) => !hiddenUids.includes(m.uid))
  const uids = visibleMonitors.map((m) => m.uid)

  const { data: measurements, isLoading } = useBucketedHistory(
    uids,
    periodo.minutes,
    bucketSegundos,
  )

  if (!monitors.length) {
    return <EmptyHint>Cadastre pontos monitorados para comparar a evolução entre eles.</EmptyHint>
  }

  const series = buildSeries(visibleMonitors)
  const wideData = toWideSeries(measurements ?? [], metric)
  const stats = seriesStats(wideData, series)
  const longFormat = LONG_FORMAT_PERIODOS.includes(periodoValue)

  function toggleMonitor(uid) {
    setHiddenUids((hidden) => {
      const isHidden = hidden.includes(uid)
      // Esconder o último ponto visível deixaria um gráfico vazio sem
      // explicação — mantém pelo menos uma série na tela.
      if (!isHidden && hidden.length === monitors.length - 1) return hidden
      return isHidden ? hidden.filter((u) => u !== uid) : [...hidden, uid]
    })
  }

  return (
    <div>
      <div className={panelStyles.chartHeader}>
        <div className={styles.pillRow}>
          {monitors.map((m) => {
            const hidden = hiddenUids.includes(m.uid)
            // Cor pela posição na lista VISÍVEL (mesma regra de
            // buildSeries), pra pastilha e linha combinarem.
            const color = series.find((s) => s.key === m.uid)?.color
            return (
              <button
                key={m.uid}
                type="button"
                className={`${styles.pill} ${hidden ? styles.pillOff : ''}`}
                onClick={() => toggleMonitor(m.uid)}
                aria-pressed={!hidden}
                title={hidden ? `Mostrar ${m.nome}` : `Ocultar ${m.nome}`}
              >
                <span
                  className={styles.pillDot}
                  style={{ background: hidden ? 'var(--text-faint)' : color }}
                />
                {m.nome}
              </button>
            )
          })}
        </div>
        <div className={panelStyles.selectorsRow}>
          <Select
            context="toolbar"
            value={metric}
            onChange={setMetric}
            options={METRICA_COMPARACAO_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
            aria-label="Métrica"
          />
          <Select
            context="toolbar"
            value={periodoValue}
            onChange={setPeriodoValue}
            options={HISTORICO_PERIODOS.map((p) => ({ value: p.value, label: p.label }))}
            aria-label="Período"
          />
        </div>
      </div>

      {isLoading ? (
        <p className={styles.loading}>Carregando medições...</p>
      ) : (
        <>
          <MultiLineChart
            data={wideData}
            series={series}
            unidade={metricInfo.unidade}
            longFormat={longFormat}
            height={300}
            emptyMessage="Nenhuma medição neste período ainda — aparece aqui assim que o agente verificar os pontos."
          />

          {/* Resumo por ponto (padrão Zabbix): responde "esse pico foi
              alto?" sem precisar passar o mouse ponto a ponto. */}
          {stats.length > 0 && wideData.length > 0 && (
            <div className={styles.statsWrap}>
              <table className={styles.statsTable}>
                <thead>
                  <tr>
                    <th>Ponto</th>
                    <th>Mín</th>
                    <th>Méd</th>
                    <th>Máx</th>
                    <th>Último</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.map((s) => (
                    <tr key={s.key}>
                      <td>
                        <span className={styles.pillDot} style={{ background: s.color }} />
                        {s.label}
                      </td>
                      <td>{s.min === null ? '—' : `${s.min} ${metricInfo.unidade}`}</td>
                      <td>{s.avg === null ? '—' : `${s.avg} ${metricInfo.unidade}`}</td>
                      <td>{s.max === null ? '—' : `${s.max} ${metricInfo.unidade}`}</td>
                      <td>{s.ultimo === null ? '—' : `${s.ultimo} ${metricInfo.unidade}`}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {bucketSegundos && (
            <p className={styles.aggNote}>
              Dados agregados em intervalos de{' '}
              {bucketSegundos >= 3600
                ? `${bucketSegundos / 3600}h`
                : `${bucketSegundos / 60} min`}{' '}
              — cada ponto do gráfico é a média do intervalo.
            </p>
          )}
        </>
      )}
    </div>
  )
}
