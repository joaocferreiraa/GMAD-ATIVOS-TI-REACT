import { useState } from 'react'
import Select from '../../ui/Select/Select'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import MultiLineChart from '../../charts/MultiLineChart/MultiLineChart'
import { useBucketedHistory } from '../../../hooks/data/useMedicoes'
import {
  HISTORICO_PERIODOS,
  BUCKET_SEGUNDOS_POR_PERIODO,
  DEFAULT_THRESHOLDS,
} from '../../../constants/monitoramento'
import { toWideSeries, buildSeries } from '../../../utils/chartSeries'
import panelStyles from '../MonitoramentoPanel.module.css'
import styles from './MetricsGridCard.module.css'

const LONG_FORMAT_PERIODOS = ['24h', '7d', '30d']

// Os três gráficos do painel, lado a lado. Latência mostra também a banda
// mín-máx do intervalo agregado (só faz sentido com um ponto por vez, por
// isso o painel é de UM ponto — a comparação entre pontos é o card de
// cima).
const PAINEIS = [
  {
    metric: 'latenciaMs',
    titulo: 'Latência',
    unidade: 'ms',
    band: { minKey: 'latenciaMin', maxKey: 'latenciaMax' },
    thresholdKey: 'latenciaMaximaMs',
  },
  {
    metric: 'packetLossPct',
    titulo: 'Perda de pacotes',
    unidade: '%',
    thresholdKey: 'packetLossMaximoPct',
  },
  {
    metric: 'disponibilidadePct',
    titulo: 'Disponibilidade',
    unidade: '%',
  },
]

// Painel de métricas de UM ponto monitorado: latência, perda de pacotes e
// disponibilidade ao mesmo tempo, no mesmo período — em vez de trocar um
// seletor de métrica pra ver cada uma. Os três compartilham período e zoom
// de leitura, então dá pra correlacionar ("a perda subiu no mesmo horário
// em que a latência disparou?") de relance, que é o motivo do dashboard em
// grade existir no Grafana/Zabbix.
export default function MetricsGridCard({ monitors }) {
  const [selectedUid, setSelectedUid] = useState(null)
  const [periodoValue, setPeriodoValue] = useState('24h')

  const selected = monitors.find((m) => m.uid === selectedUid) ?? monitors[0]
  const periodo = HISTORICO_PERIODOS.find((p) => p.value === periodoValue) ?? HISTORICO_PERIODOS[4]
  const bucketSegundos = BUCKET_SEGUNDOS_POR_PERIODO[periodoValue] ?? null

  // Hook sempre chamado na mesma ordem (regra do React), mesmo sem ponto
  // selecionado — useBucketedHistory já lida com lista vazia (enabled).
  const { data: measurements, isLoading } = useBucketedHistory(
    selected ? [selected.uid] : [],
    periodo.minutes,
    bucketSegundos,
  )

  if (!monitors.length) {
    return <EmptyHint>Cadastre um ponto monitorado para ver o painel de métricas.</EmptyHint>
  }

  const series = buildSeries([selected])
  const longFormat = LONG_FORMAT_PERIODOS.includes(periodoValue)
  const thresholds = { ...DEFAULT_THRESHOLDS, ...(selected.thresholds || {}) }

  return (
    <div>
      <div className={panelStyles.chartHeader}>
        {monitors.length > 1 ? (
          <div className={styles.pillRow}>
            {monitors.map((m) => (
              <button
                key={m.uid}
                type="button"
                className={`${styles.pill} ${m.uid === selected.uid ? styles.pillActive : ''}`}
                onClick={() => setSelectedUid(m.uid)}
              >
                {m.nome}
              </button>
            ))}
          </div>
        ) : (
          <span>{selected.nome}</span>
        )}
        <div className={panelStyles.selectorsRow}>
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
        <div className={styles.grid}>
          {PAINEIS.map((p) => {
            const wide = toWideSeries(measurements ?? [], p.metric)
            // A banda mín-máx só existe em dados agregados (períodos
            // longos): em medição crua não há "mín/máx do intervalo", cada
            // linha já É um valor único. Anexa as duas colunas extras ao
            // formato largo, sem alterar `wide` no lugar.
            const showBand = !!p.band && !!bucketSegundos
            const bandByBucket = showBand
              ? new Map((measurements ?? []).map((m) => [m.createdAt, m]))
              : null
            const chartData = showBand
              ? wide.map((row) => {
                  const m = bandByBucket.get(row.bucket)
                  return {
                    ...row,
                    [p.band.minKey]: m?.latenciaMin ?? null,
                    [p.band.maxKey]: m?.latenciaMax ?? null,
                  }
                })
              : wide
            const limite = p.thresholdKey ? thresholds[p.thresholdKey] : null

            return (
              <div key={p.metric} className={styles.panel}>
                <h4 className={styles.panelTitle}>
                  {p.titulo}
                  <span className={styles.panelUnit}>{p.unidade}</span>
                </h4>
                <MultiLineChart
                  data={chartData}
                  series={series}
                  unidade={p.unidade}
                  height={190}
                  longFormat={longFormat}
                  band={showBand ? p.band : null}
                  thresholds={
                    limite ? [{ valor: limite, label: `limite ${limite}${p.unidade}` }] : []
                  }
                  emptyMessage="Sem medições neste período."
                />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
