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
//
// `mostrarPercentual`: acrescenta a fatia de cada item ao lado da contagem.
// "62" responde quantos; "95%" responde se isso é muito ou pouco — e num
// gráfico de proporção, essa é a pergunta que a pessoa está fazendo.
//
// `rodape`: [{label, value}] abaixo da legenda, para o que a rosca em si não
// mostra. Fica no rodapé e não na legenda de propósito: legenda é o que está
// desenhado, rodapé é leitura sobre o desenho.
export default function DonutChart({
  data,
  colors,
  unitLabel = 'total',
  emptyMessage = 'Sem dados suficientes.',
  mostrarPercentual = false,
  rodape,
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (!total) return <EmptyHint>{emptyMessage}</EmptyHint>

  // Cor atribuída pelo índice original (antes do filtro) — senão a cor de
  // cada rótulo mudaria conforme quais outros itens têm valor zero, o que
  // quebra mapeamentos semânticos como status (verde/laranja/vermelho).
  const chartData = data
    .map((d, index) => ({ ...d, color: colors[index % colors.length] }))
    .filter((d) => d.value > 0)

  return (
    <div className={styles.wrap}>
      <div className={styles.donut}>
        <ResponsiveContainer width={148} height={148}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="label"
              // Anel grosso (26px, era 18): o total no centro continua
              // cabendo, e cada fatia vira um bloco de cor de verdade em
              // vez de um aro fino. Ver .donut (148px) em DonutChart.module.css
              // — o raio externo é o mesmo, quem cresceu foi a espessura.
              innerRadius={44}
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
            {mostrarPercentual && (
              // Arredondado pra inteiro: a precisão decimal aqui não muda
              // decisão nenhuma e só competiria com a contagem ao lado.
              <span className={styles.legendPercent}>{Math.round((d.value / total) * 100)}%</span>
            )}
            <span className={styles.legendValue}>{d.value}</span>
          </div>
        ))}

        {rodape?.length ? (
          <div className={styles.rodape}>
            {rodape.map((linha) => (
              <div key={linha.label} className={styles.rodapeRow}>
                <span className={styles.rodapeLabel}>{linha.label}</span>
                <span className={styles.rodapeValue}>{linha.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}
