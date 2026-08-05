import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import styles from './BarChart.module.css'

// Gráfico de barras horizontais "caseiro" (equivalente ao barChart() do
// sistema original — sem biblioteca de gráficos). `data`: [{label, value}];
// `colors`: paleta cíclica por índice; `unitLabel`: sufixo do total (ex.: "ativos").
export default function BarChart({
  data,
  colors,
  unitLabel = 'total',
  emptyMessage = 'Sem dados suficientes.',
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (!total) return <EmptyHint>{emptyMessage}</EmptyHint>

  const max = Math.max(...data.map((d) => d.value))

  return (
    <div>
      <div className={styles.bars}>
        {data
          .filter((d) => d.value > 0)
          .map((d, index) => {
            const color = colors[index % colors.length]
            return (
              <div key={d.label} className={styles.row}>
                <span className={styles.dot} style={{ background: color }} />
                <div className={styles.label}>{d.label}</div>
                <div className={styles.track}>
                  <div
                    className={styles.fill}
                    style={{ width: `${Math.round((d.value / max) * 100)}%`, background: color }}
                  />
                </div>
                <div className={styles.value}>{d.value}</div>
              </div>
            )
          })}
      </div>
      <div className={styles.total}>
        {total} {unitLabel} no total
      </div>
    </div>
  )
}
