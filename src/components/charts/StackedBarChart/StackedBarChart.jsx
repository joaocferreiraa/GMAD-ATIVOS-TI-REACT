import { useMemo } from 'react'
import {
  BarChart as RBarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import styles from './StackedBarChart.module.css'

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const rows = payload.filter((p) => p.value > 0)
  if (!rows.length) return null
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      {rows.map((p) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.dot} style={{ background: p.fill }} />
          <span className={styles.tooltipLabel}>{p.dataKey}</span>
          <span className={styles.tooltipValue}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// Uma única barra horizontal por unidade, dividida em segmentos por
// categoria (aqui: departamento) — alternativa mais compacta ao "bloco por
// unidade com uma barra por categoria" de BarChart/DeptByUnit, quando o que
// importa é comparar a composição das unidades lado a lado num único
// relance. `units`: [{label, total, bars: [{label, value}]}] (mesmo formato
// de DeptByUnit); `colors`: paleta cíclica — como o número de categorias
// costuma passar do tamanho da paleta, cada segmento leva um contorno da cor
// de fundo do card pra não embaçar quando duas cores repetem lado a lado; o
// hover sempre mostra o nome exato, então a cor é só uma pista aproximada.
export default function StackedBarChart({ units, colors, emptyMessage = 'Sem dados suficientes.' }) {
  const categories = useMemo(() => {
    const totals = new Map()
    units.forEach((u) => u.bars.forEach((b) => totals.set(b.label, (totals.get(b.label) || 0) + b.value)))
    return Array.from(totals.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([label]) => label)
  }, [units])

  if (!categories.length) return <EmptyHint>{emptyMessage}</EmptyHint>

  const rows = units.map((u) => {
    const row = { label: u.label, total: u.total }
    categories.forEach((c) => {
      row[c] = u.bars.find((b) => b.label === c)?.value || 0
    })
    return row
  })

  return (
    <div>
      <div style={{ width: '100%', height: rows.length * 44 }}>
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart
            data={rows}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
            barCategoryGap={10}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="label"
              width={110}
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'var(--text-muted)', fontSize: 12 }}
            />
            <Tooltip cursor={{ fill: 'var(--surface-hover)' }} content={<ChartTooltip />} />
            {categories.map((category, index) => (
              <Bar
                key={category}
                dataKey={category}
                stackId="categories"
                fill={colors[index % colors.length]}
                stroke="var(--surface)"
                strokeWidth={1}
                radius={
                  index === 0
                    ? [6, 0, 0, 6]
                    : index === categories.length - 1
                      ? [0, 6, 6, 0]
                      : undefined
                }
                isAnimationActive
              />
            ))}
          </RBarChart>
        </ResponsiveContainer>
      </div>
      <div className={styles.legend}>
        {categories.map((category, index) => (
          <div key={category} className={styles.legendItem}>
            <span className={styles.dot} style={{ background: colors[index % colors.length] }} />
            {category}
          </div>
        ))}
      </div>
    </div>
  )
}
