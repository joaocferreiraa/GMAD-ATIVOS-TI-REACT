import {
  BarChart as RBarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  LabelList,
  ResponsiveContainer,
} from 'recharts'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import styles from './BarChart.module.css'

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

// Gráfico de barras horizontais (Recharts). `data`: [{label, value}];
// `colors`: paleta cíclica por índice; `unitLabel`: sufixo do total (ex.:
// "ativos"); `compact`: versão reduzida usada dentro dos blocos por unidade
// de DeptByUnit; `showTotal`: exibe a linha "N ... no total" abaixo do gráfico.
export default function BarChart({
  data,
  colors,
  unitLabel = 'total',
  emptyMessage = 'Sem dados suficientes.',
  compact = false,
  showTotal = true,
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (!total) return <EmptyHint>{emptyMessage}</EmptyHint>

  const chartData = data
    .filter((d) => d.value > 0)
    .map((d, index) => ({ ...d, color: colors[index % colors.length] }))

  const rowHeight = compact ? 26 : 34
  const labelWidth = compact ? 92 : 122
  const barSize = compact ? 6 : 9
  const tickFontSize = compact ? 11 : 12.5

  return (
    <div>
      <div style={{ width: '100%', height: chartData.length * rowHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 0, right: 28, bottom: 0, left: 0 }}
            barCategoryGap={compact ? 6 : 10}
          >
            <XAxis type="number" hide domain={[0, (max) => Math.ceil(max * 1.25)]} />
            <YAxis
              type="category"
              dataKey="label"
              width={labelWidth}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: tickFontSize }}
            />
            <Tooltip cursor={{ fill: 'var(--surface-hover)' }} content={<ChartTooltip />} />
            <Bar dataKey="value" radius={[999, 999, 999, 999]} barSize={barSize} isAnimationActive>
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
              <LabelList
                dataKey="value"
                position="right"
                style={{
                  fill: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: tickFontSize,
                  fontWeight: 700,
                }}
              />
            </Bar>
          </RBarChart>
        </ResponsiveContainer>
      </div>
      {showTotal && (
        <div className={styles.total}>
          {total} {unitLabel} no total
        </div>
      )}
    </div>
  )
}
