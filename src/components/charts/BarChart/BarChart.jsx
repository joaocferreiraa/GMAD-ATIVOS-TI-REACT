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
import { corDeCategoria } from '../../../utils/corDeCategoria'
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
// `colunas`: barras em pé, com o rótulo embaixo girado a -45°. O giro não é
// enfeite — em coluna o rótulo herda a largura da barra (~30px numa meia
// página com 13 departamentos), e nomes como "Crédito e Cobrança" só cabem
// deitados. Custa altura, que é o preço da orientação.
//
// O padrão continua horizontal, que é o melhor formato para ranking de
// categoria com nome comprido: cada rótulo ganha uma linha inteira.
export default function BarChart({
  data,
  colors,
  unitLabel = 'total',
  emptyMessage = 'Sem dados suficientes.',
  compact = false,
  showTotal = true,
  colunas = false,
  corPorRotulo = false,
}) {
  const total = data.reduce((sum, d) => sum + d.value, 0)
  if (!total) return <EmptyHint>{emptyMessage}</EmptyHint>

  // Por padrão a cor vem do índice original (antes do filtro) — senão a cor de
  // cada rótulo mudaria conforme quais outros itens têm valor zero. É o que
  // Chamados precisa: lá o `colors` chega alinhado item a item, com a cor
  // semântica de cada prioridade, e derivar do texto jogaria fora esse
  // significado.
  //
  // `corPorRotulo` inverte isso para os gráficos que recebem uma paleta
  // cíclica genérica e aparecem em vários blocos lado a lado: aí a cor precisa
  // seguir o NOME, senão o mesmo departamento muda de cor de um bloco pro
  // outro só porque ficou em outra posição no ranking.
  const chartData = data
    .map((d, index) => ({
      ...d,
      color: corPorRotulo ? corDeCategoria(d.label, colors) : colors[index % colors.length],
    }))
    .filter((d) => d.value > 0)

  // Barras cheias em vez dos fios de 6-9px de antes: a barra é o dado, e
  // com a altura da linha inalterada só o "ar" em volta dela encolhe — o
  // gráfico ocupa o mesmo espaço e passa a ser lido de relance. O raio 999
  // continua arredondando as pontas, então uma barra grossa não vira um
  // bloco retangular.
  // `compact` encolhe o ENTORNO (altura da linha, faixa do rótulo, tamanho da
  // fonte), não a barra: a espessura é 20px nos dois modos, igual à dos
  // gráficos de Chamados. Já foi 13px no compacto, e o resultado era o mesmo
  // dado parecendo menos importante só por estar dentro de um bloco por
  // unidade — além de destoar de um gráfico para o outro no mesmo sistema.
  //
  // A linha compacta subiu de 28 para 34px junto: com barra de 20px, os 28
  // deixavam 8px de respiro e as barras quase se encostavam.
  const rowHeight = compact ? 34 : 36
  const labelWidth = compact ? 92 : 122
  const barSize = 20
  const tickFontSize = compact ? 11 : 12.5

  // Faixa reservada ao rótulo girado, calculada a partir do NOME MAIS LONGO
  // em vez de um valor fixo. Com valor fixo, "Departamento Pessoal" e
  // "Crédito e Cobrança" perdiam as primeiras letras: girado a -45° o texto
  // desce à esquerda, e o que passa da faixa é cortado pelo SVG.
  //
  // A conta: ~0.55 do tamanho da fonte por caractere é uma boa aproximação de
  // largura média para a DM Sans; a -45° a altura ocupada é essa largura
  // vezes sen(45°) ≈ 0.71. O teto de 150px evita que um nome absurdo coma o
  // gráfico inteiro — nesse caso é melhor cortar mesmo.
  const maiorRotulo = Math.max(0, ...chartData.map((d) => String(d.label ?? '').length))
  const alturaRotulos = Math.min(150, Math.round(maiorRotulo * tickFontSize * 0.55 * 0.71) + 18)

  // Em colunas a altura da área do gráfico é fixa (as barras dividem a
  // largura, não a altura); só a faixa de rótulos varia.
  const altura = colunas ? (compact ? 150 : 190) + alturaRotulos : chartData.length * rowHeight

  const rotuloValor = {
    fill: 'var(--text)',
    fontFamily: 'var(--font-mono)',
    // Um ponto acima do rótulo do eixo: numa barra grossa o número é o
    // desfecho da leitura, não uma nota de rodapé.
    fontSize: tickFontSize + 1,
    fontWeight: 700,
  }

  return (
    <div>
      <div className={styles.chart} style={{ width: '100%', height: altura }}>
        <ResponsiveContainer width="100%" height="100%">
          <RBarChart
            data={chartData}
            layout={colunas ? 'horizontal' : 'vertical'}
            margin={
              colunas
                ? { top: 18, right: 6, bottom: 0, left: 6 }
                : // 38 e não 28: a margem precisa caber o número MAIS o
                  // afastamento novo de 12px (ver LabelList) — senão um valor
                  // de três dígitos na barra mais longa sai cortado na borda.
                  { top: 0, right: 38, bottom: 0, left: 0 }
            }
            barCategoryGap={compact ? 6 : 10}
          >
            {colunas ? (
              <>
                <XAxis
                  type="category"
                  dataKey="label"
                  // interval 0 força TODO rótulo a aparecer: o padrão do
                  // Recharts esconde os que não cabem, e sumir com metade dos
                  // departamentos sem avisar é pior que girar o texto.
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={alturaRotulos}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: tickFontSize }}
                />
                <YAxis type="number" hide domain={[0, (max) => Math.ceil(max * 1.15)]} />
              </>
            ) : (
              <>
                <XAxis type="number" hide domain={[0, (max) => Math.ceil(max * 1.25)]} />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={labelWidth}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--text-muted)', fontSize: tickFontSize }}
                />
              </>
            )}
            <Tooltip cursor={{ fill: 'var(--surface-hover)' }} content={<ChartTooltip />} />
            <Bar
              dataKey="value"
              // Canto LEVEMENTE arredondado (3px), não a pílula de antes nem o
              // reto puro. A pílula (raio 999) fazia a sombra dura acompanhar
              // a curva inteira e o efeito 3D virava contorno; o reto puro
              // resolvia isso mas destoava do resto da interface, que
              // arredonda tudo (--radius-control é 6px).
              //
              // 3px é metade do raio dos controles de propósito: numa barra de
              // 13-20px, 6px já comeria boa parte da ponta e voltaria a
              // parecer pílula. O bloco continua lendo como bloco, só sem a
              // aresta cortante.
              radius={3}
              barSize={barSize}
              isAnimationActive
            >
              {chartData.map((entry) => (
                <Cell key={entry.label} fill={entry.color} />
              ))}
              {/* O afastamento precisa contar a SOMBRA, não a barra: ela
                  avança 4px à direita (ver --chart-shadow-3d), então o padrão
                  de 5px do Recharts deixava o número encostado nela. 12px = os
                  4px da sombra mais um respiro que sobrevive se o
                  deslocamento mudar. Em coluna o número fica ACIMA da barra e
                  a sombra desce, então não há colisão — só o respiro. */}
              <LabelList
                dataKey="value"
                position={colunas ? 'top' : 'right'}
                offset={colunas ? 8 : 12}
                style={rotuloValor}
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
