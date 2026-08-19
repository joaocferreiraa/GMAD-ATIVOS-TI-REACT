import { useMemo } from 'react'
import {
  RadarChart as RRadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import styles from './RadarChart.module.css'

// Tooltip com TODAS as unidades daquele eixo, da maior pra menor — o motivo
// do radar existir é comparar o perfil das unidades, então ver só a que
// está sob o cursor obrigaria a passar o mouse quatro vezes no mesmo ponto.
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const linhas = payload.filter((p) => p.value > 0).sort((a, b) => b.value - a.value)
  if (!linhas.length) return null

  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipTitle}>{label}</div>
      {linhas.map((p) => (
        <div key={p.dataKey} className={styles.tooltipRow}>
          <span className={styles.dot} style={{ background: p.stroke }} />
          <span className={styles.tooltipLabel}>{p.dataKey}</span>
          <span className={styles.tooltipValue}>{p.value}</span>
        </div>
      ))}
    </div>
  )
}

// Gráfico de radar (teia): um EIXO por categoria e um POLÍGONO por unidade,
// sobrepostos. Alternativa ao StackedBarChart pros mesmos dados — a barra
// empilhada responde "quanto cada unidade tem no total"; o radar responde
// "qual o FORMATO de cada unidade", ou seja, em que setores ela se concentra
// e onde tem buraco. `units`: [{label, total, bars: [{label, value}]}]
// (mesmo formato de DeptByUnit/StackedBarChart); `colors`: paleta cíclica.
//
// QUANDO ELE FUNCIONA: 5-8 eixos e 2-4 polígonos de grandezas parecidas.
// Muito mais eixos e os rótulos se atropelam na borda; uma unidade muito
// maior que as outras achata as demais contra o centro, porque todos os
// polígonos dividem a mesma escala radial (que é justamente o que permite
// compará-los).
//
// `categories` e `domainMax` existem pra DOIS RADARES LADO A LADO serem
// comparáveis: passando os mesmos valores nos dois, cada departamento fica
// na mesma posição angular e o mesmo raio vale o mesmo número. Sem eles,
// cada radar calcula a própria escala e dois desenhos idênticos podem estar
// representando 3 e 40 — o erro clássico de radar em painel. Omitidos, o
// componente deriva os dois dos próprios dados (radar sozinho na tela).
//
// Com `categories` fixo, um grupo AINDA SEM DADOS desenha a teia vazia em
// vez de sumir: os eixos já mostram o que vai ser preenchido, e o gráfico se
// completa sozinho conforme os registros entram.
export default function RadarChart({
  units,
  colors,
  categories = null,
  domainMax = null,
  height,
  emptyMessage = 'Sem dados suficientes.',
}) {
  const { data, series } = useMemo(() => {
    let categorias = categories
    if (!categorias) {
      // Eixo de categoria zerada em TODAS as unidades é um espinho vazio na
      // teia, roubando espaço dos rótulos de quem tem dado.
      const totalPorCategoria = new Map()
      units.forEach((u) =>
        u.bars.forEach((b) =>
          totalPorCategoria.set(b.label, (totalPorCategoria.get(b.label) || 0) + b.value),
        ),
      )
      categorias = Array.from(totalPorCategoria.entries())
        .filter(([, total]) => total > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([label]) => label)
    }

    // TODAS as unidades viram série, inclusive as zeradas. Não é só
    // completude: o Recharts deriva os anéis da teia dos ticks do eixo
    // radial, e o eixo radial só existe se houver série. Um grupo sem
    // nenhuma série renderizava os rótulos soltos no vazio, sem grade
    // nenhuma — que é exatamente o que não pode acontecer numa unidade que
    // ainda vai ser preenchida.
    return {
      series: units.map((u, i) => ({
        key: u.label,
        color: colors[i % colors.length],
        // Ponto em cada vértice só onde há o que marcar: numa série toda
        // zerada os vértices caem todos no centro e viram um borrão.
        temValor: u.bars.some((b) => b.value > 0),
      })),
      data: categorias.map((c) => {
        const linha = { categoria: c }
        units.forEach((u) => {
          linha[u.label] = u.bars.find((b) => b.label === c)?.value || 0
        })
        return linha
      }),
    }
  }, [units, colors, categories])

  // Menos de 3 eixos não fecha polígono — vira uma linha ou um ponto, e a
  // leitura de "formato" que justifica o radar deixa de existir.
  if (data.length < 3) return <EmptyHint>{emptyMessage}</EmptyHint>

  const desenhadas = series.filter((s) => s.temValor)

  return (
    <div>
      {/* Altura generosa: os rótulos de categoria ficam FORA do polígono, e
          apertar a altura corta os de cima e de baixo. */}
      <div className={styles.chartWrap} style={height ? { height } : undefined}>
        <ResponsiveContainer width="100%" height="100%">
          <RRadarChart
            data={data}
            outerRadius="72%"
            margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="categoria"
              tick={{ fill: 'var(--text-muted)', fontSize: 11.5 }}
            />
            {/* Eixo radial sem rótulo: com vários polígonos sobrepostos os
                números no raio caem em cima das linhas e não se lêem. A
                grandeza exata sai no tooltip, que é onde ela é pedida.
                O domínio começa SEMPRE em 0 — num radar o raio é a grandeza,
                e cortar a base infla visualmente as diferenças. */}
            <PolarRadiusAxis
              tick={false}
              axisLine={false}
              // tickCount fixo: são os ticks deste eixo que viram os anéis da
              // teia. Deixado no automático, um grupo todo zerado gera pouco
              // (ou nenhum) tick e a grade sai diferente da do gráfico ao
              // lado — os dois precisam ter a mesma quantidade de anéis pra
              // serem lidos como o mesmo gráfico.
              tickCount={5}
              domain={domainMax ? [0, domainMax] : undefined}
            />
            <Tooltip content={<ChartTooltip />} />
            {series.map((s) => (
              <Radar
                key={s.key}
                name={s.key}
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={3}
                fill={s.color}
                // Translúcido de propósito: os polígonos se sobrepõem, e um
                // preenchimento opaco esconderia por inteiro qualquer
                // unidade menor que caia dentro de outra.
                fillOpacity={0.25}
                dot={s.temValor ? { r: 3.5, fill: s.color, strokeWidth: 0 } : false}
                isAnimationActive
              />
            ))}
          </RRadarChart>
        </ResponsiveContainer>
      </div>
      {/* A legenda lista só quem tem polígono desenhado. Unidade zerada é
          série (a teia depende disso, ver acima) mas não aparece aqui:
          um nome na legenda sem nada correspondente no gráfico faz procurar
          uma forma que não existe.
          Quando NINGUÉM tem dado, a teia fica lá vazia — e sem uma linha
          explicando ela lê como gráfico quebrado, não como "ainda não há o
          que mostrar". */}
      {desenhadas.length === 0 ? (
        <p className={styles.aguardando}>{emptyMessage}</p>
      ) : (
        <div className={styles.legend}>
          {desenhadas.map((s) => (
            <div key={s.key} className={styles.legendItem}>
              <span className={styles.dot} style={{ background: s.color }} />
              {s.key}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
