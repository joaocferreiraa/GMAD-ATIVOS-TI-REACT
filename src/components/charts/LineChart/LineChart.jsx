import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import styles from './LineChart.module.css'

function timeLabel(iso) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function ChartTooltip({ active, payload, unidade }) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipTime}>{timeLabel(point.createdAt)}</span>
      <span className={styles.tooltipValue}>
        {point.value === null || point.value === undefined
          ? 'Sem medição'
          : `${point.value} ${unidade}`}
      </span>
    </div>
  )
}

// Gráfico de linha/área temporal (Recharts) — usado pelo histórico/tempo
// real do Monitoramento de Rede. `data`: [{ createdAt: isoString, value:
// number|null }], já ordenado do mais antigo pro mais novo. `value` null
// vira um buraco na linha (medição indisponível), nunca interpolado como
// se fosse um dado real.
//
// Uma série só (uma cor, sem legenda — o título do card já diz o que é),
// linha de 2px, wash de 10% sob a linha, crosshair + ponto de destaque com
// anel de 2px na cor da superfície ao passar o mouse — mesmo padrão do
// resto dos gráficos do site (DonutChart/BarChart), sem gradiente.
export default function LineChart({
  data,
  color = 'var(--brand)',
  unidade = '',
  height = 220,
  emptyMessage = 'Nenhuma medição registrada neste período ainda.',
}) {
  if (!data.length) return <EmptyHint>{emptyMessage}</EmptyHint>

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -12 }}>
          <CartesianGrid stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="createdAt"
            tickFormatter={timeLabel}
            axisLine={false}
            tickLine={false}
            minTickGap={40}
            tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
          />
          <YAxis
            axisLine={false}
            tickLine={false}
            width={40}
            tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
          />
          <Tooltip
            content={<ChartTooltip unidade={unidade} />}
            cursor={{ stroke: 'var(--border-strong)' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={color}
            fillOpacity={0.1}
            dot={false}
            activeDot={{ r: 5, fill: color, stroke: 'var(--surface)', strokeWidth: 2 }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
