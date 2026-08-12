import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import styles from './DonutChart.module.css'

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null
  const { label, value, color } = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipDot} style={{ background: color }} />
      <span className={styles.tooltipLabel}>{label}</span>
      <span className={styles.tooltipValue}>{value}</span>
    </div>
  )
}

// Gráfico de rosca (donut) com o total em destaque no centro e legenda ao
// lado. `data`: [{label, value}]; `colors`: paleta cíclica por índice;
// `unitLabel`: texto abaixo do total central (ex.: "ativos").
export default function DonutChart({
  data,
  colors,
  unitLabel = 'total',
  emptyMessage = 'Sem dados suficientes.',
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (!total) return <EmptyHint>{emptyMessage}</EmptyHint>

  const chartData = data
    .filter((d) => d.value > 0)
    .map((d, index) => ({ ...d, color: colors[index % colors.length] }))

  return (
    <div className={styles.wrap}>
      <div className={styles.donut}>
        <ResponsiveContainer width={148} height={148}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              innerRadius={52}
              outerRadius={70}
              paddingAngle={2}
              stroke="none"
              isAnimationActive
            >
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.center}>
          <div className={styles.centerValue}>{total}</div>
          <div className={styles.centerLabel}>{unitLabel}</div>
        </div>
      </div>
      <div className={styles.legend}>
        {chartData.map((d) => (
          <div key={d.label} className={styles.legendRow}>
            <span className={styles.dot} style={{ background: d.color }} />
            <span className={styles.legendLabel}>{d.label}</span>
            <span className={styles.legendValue}>{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
