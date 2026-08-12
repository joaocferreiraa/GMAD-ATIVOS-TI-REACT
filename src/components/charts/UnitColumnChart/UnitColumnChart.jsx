import { useState } from 'react'
import { BarChart, Bar, Cell, XAxis, YAxis, Tooltip, LabelList, ResponsiveContainer } from 'recharts'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import styles from './UnitColumnChart.module.css'

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

// Gráfico de coluna (barras verticais) — orientação diferente da barra
// horizontal já usada em "Distribuição por setor" logo abaixo. Passar o
// mouse ou clicar numa coluna (ou tocar, no mobile) fixa o foco, atualizando
// o número em destaque no topo. `data`: [{label, value}]; `colors`: paleta
// por índice (mesma ordem de `data`); `unitLabel`: sufixo do valor em
// destaque (ex.: "ativos").
export default function UnitColumnChart({
  data,
  colors,
  unitLabel = 'total',
  emptyMessage = 'Sem dados suficientes.',
}) {
  const [hoveredLabel, setHoveredLabel] = useState(null)
  const [pinnedLabel, setPinnedLabel] = useState(null)

  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (!total) return <EmptyHint>{emptyMessage}</EmptyHint>

  const chartData = data
    .filter((d) => d.value > 0)
    .map((d, index) => ({ ...d, color: colors[index % colors.length] }))

  const focusLabel = hoveredLabel ?? pinnedLabel
  const focus = focusLabel ? chartData.find((d) => d.label === focusLabel) : null

  function togglePin(label) {
    setPinnedLabel((cur) => (cur === label ? null : label))
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.headline}>
        {focus ? (
          <>
            <span className={styles.heroValue} style={{ color: focus.color }}>
              {focus.value}
            </span>
            <span className={styles.heroLabel}>
              {focus.label} · {Math.round((focus.value / total) * 100)}%
            </span>
          </>
        ) : (
          <>
            <span className={styles.heroValue}>{total}</span>
            <span className={styles.heroLabel}>{unitLabel} no total</span>
          </>
        )}
      </div>

      <div className={styles.chart}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 18, right: 6, bottom: 0, left: 6 }}>
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={{ stroke: 'var(--border)' }}
              interval={0}
              tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
            />
            <YAxis hide domain={[0, (max) => Math.ceil(max * 1.2)]} />
            <Tooltip cursor={{ fill: 'var(--surface-hover)' }} content={<ChartTooltip />} />
            <Bar
              dataKey="value"
              radius={[6, 6, 0, 0]}
              maxBarSize={52}
              isAnimationActive
              onMouseEnter={(_, index) => setHoveredLabel(chartData[index]?.label ?? null)}
              onMouseLeave={() => setHoveredLabel(null)}
              onClick={(_, index) => togglePin(chartData[index]?.label)}
            >
              {chartData.map((entry) => (
                <Cell
                  key={entry.label}
                  fill={entry.color}
                  opacity={focusLabel && focusLabel !== entry.label ? 0.45 : 1}
                  className={styles.bar}
                />
              ))}
              <LabelList
                dataKey="value"
                position="top"
                style={{
                  fill: 'var(--text)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 700,
                }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
