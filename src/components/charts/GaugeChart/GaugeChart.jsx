import styles from './GaugeChart.module.css'

// Geometria do velocímetro: semicírculo de 180° (esquerda -> direita).
// O viewBox tem 200x120 e o arco é desenhado com centro em (100, 100) e
// raio 74 — então o topo do arco fica em y=26 e as pontas em y=100, com
// folga embaixo pro valor numérico. `preserveAspectRatio` padrão (meet)
// mantém a proporção: o SVG nunca é esticado, então a agulha aponta
// exatamente pro ponto da escala que corresponde ao valor.
const START_ANGLE = 180
const SWEEP = 180
const CX = 100
const CY = 100
const R = 74
const STROKE = 15

function polar(angleDeg, radius = R) {
  const rad = (angleDeg * Math.PI) / 180
  return { x: CX + radius * Math.cos(rad), y: CY - radius * Math.sin(rad) }
}

function arcPath(fromDeg, toDeg, radius = R) {
  const start = polar(fromDeg, radius)
  const end = polar(toDeg, radius)
  const largeArc = Math.abs(toDeg - fromDeg) > 180 ? 1 : 0
  return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y}`
}

function angleFor(fraction) {
  return START_ANGLE - fraction * SWEEP
}

function clampFraction(value, min, max) {
  if (max === min) return 0
  return Math.min(Math.max((value - min) / (max - min), 0), 1)
}

function fmtCompact(v) {
  if (v === null || v === undefined) return '—'
  if (Math.abs(v) >= 1000) return `${Math.round(v / 100) / 10}k`
  return Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100)
}

// Velocímetro (gauge) no estilo dos painéis de Grafana/Zabbix: ponteiro
// sobre um arco com zonas coloridas, escala numerada, marcador do limite
// configurado, mín/méd/máx da janela e sparkline de tendência.
//
// `value`: número ou null (null = sem medição; mostra "—", nunca 0).
// `zones`: [{ ate, color }] em ordem crescente — a cor sai da zona onde o
// valor cai, então serve tanto pra métrica onde menor é melhor (latência)
// quanto onde maior é melhor (disponibilidade). `limite`: threshold
// configurado no ponto. `stats`: { min, avg, max }. `trend`: números do
// mais antigo pro mais novo.
export default function GaugeChart({
  value,
  max,
  min = 0,
  unidade = '',
  label,
  zones = [],
  limite = null,
  stats = null,
  trend = null,
  // `size` em px fixa a largura; `fluid` faz o gauge ocupar a largura do
  // container (com `size` virando o teto máximo) — usado no modo TV, onde
  // o mostrador cresce junto com a coluna da grade.
  size = 240,
  fluid = false,
  ticks = 5,
}) {
  const temValor = value !== null && value !== undefined && !Number.isNaN(value)
  const fraction = temValor ? clampFraction(value, min, max) : 0
  const valueAngle = angleFor(fraction)

  const zonaAtual = temValor ? (zones.find((z) => value <= z.ate) ?? zones[zones.length - 1]) : null
  const valorColor = zonaAtual?.color ?? (temValor ? 'var(--text)' : 'var(--text-faint)')

  const tickList = Array.from({ length: ticks }, (_, i) => {
    const f = i / (ticks - 1)
    return { f, valor: min + f * (max - min) }
  })

  const limiteVisivel = limite !== null && limite !== undefined && limite > min && limite < max
  const limiteAngle = limiteVisivel ? angleFor(clampFraction(limite, min, max)) : null

  // O arco do valor preenche o trilho com a cor cheia da zona atual. O
  // "tarugo" que aparecia à esquerda com valores baixos vinha do
  // strokeLinecap="round", que acrescenta meio círculo de STROKE/2 (7.5px)
  // em CADA ponta — num arco de 10px, as duas pontas arredondadas eram
  // maiores que o próprio arco. Com `butt` o traço termina reto e
  // acompanha o comprimento real.
  //
  // Abaixo de ~6px de arco (valor quase no zero da escala) nem isso se
  // sustenta, então o arco é omitido: o ponteiro encostado no mínimo e o
  // número já dizem tudo, sem um risco solto na borda.
  const comprimentoArcoPx = fraction * Math.PI * R
  const desenhaArco = temValor && comprimentoArcoPx >= 6

  return (
    <div
      className={styles.wrap}
      style={fluid ? { width: '100%', maxWidth: size } : { width: size }}
    >
      {/* viewBox 200x150: o arco ocupa até y=100 (pivô) e sobram 50
          unidades embaixo pro valor numérico respirar. Antes eram 120, e o
          número de 27px acabava colidindo com o pivô do ponteiro. */}
      <svg
        viewBox="0 0 200 150"
        width={fluid ? '100%' : size}
        height={fluid ? undefined : size * 0.75}
        role="img"
        aria-label={`${label}: ${temValor ? `${value} ${unidade}` : 'sem medição'}`}
      >
        {/* Trilho de fundo. `butt` (não `round`): com ponta arredondada, o
            semicírculo do linecap se somava à primeira zona colorida e
            formava um "tarugo" saliente na esquerda do mostrador. */}
        <path
          d={arcPath(START_ANGLE, 0)}
          fill="none"
          stroke="var(--gauge-track, var(--border))"
          strokeWidth={STROKE}
          strokeLinecap="butt"
        />

        {/* Zonas coloridas de fundo (bom/atenção/ruim). `butt` nas pontas:
            zonas adjacentes precisam encostar sem sobrepor. */}
        {zones.map((z, i) => {
          const inicio = i === 0 ? min : zones[i - 1].ate
          const f1 = clampFraction(inicio, min, max)
          const f2 = clampFraction(z.ate, min, max)
          if (f2 <= f1) return null
          return (
            <path
              key={z.ate}
              d={arcPath(angleFor(f1), angleFor(f2))}
              fill="none"
              stroke={z.color}
              strokeWidth={STROKE}
              strokeOpacity={0.22}
              strokeLinecap="butt"
            />
          )
        })}

        {/* Marcações da escala */}
        {tickList.map((t) => {
          const a = angleFor(t.f)
          const p1 = polar(a, R - STROKE / 2 - 1)
          const p2 = polar(a, R - STROKE / 2 - 5)
          const pt = polar(a, R - STROKE / 2 - 14)
          return (
            <g key={t.f}>
              <line
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="var(--text-faint)"
                strokeWidth={1.1}
                strokeOpacity={0.6}
              />
              <text x={pt.x} y={pt.y + 3} className={styles.tickText} textAnchor="middle">
                {fmtCompact(Math.round(t.valor * 10) / 10)}
              </text>
            </g>
          )
        })}

        {/* Marcador do limite configurado (threshold do Grafana) */}
        {limiteVisivel && (
          <line
            x1={polar(limiteAngle, R + STROKE / 2).x}
            y1={polar(limiteAngle, R + STROKE / 2).y}
            x2={polar(limiteAngle, R - STROKE / 2).x}
            y2={polar(limiteAngle, R - STROKE / 2).y}
            stroke="var(--danger)"
            strokeWidth={2.5}
            strokeLinecap="butt"
          >
            <title>{`Limite configurado: ${limite}${unidade}`}</title>
          </line>
        )}

        {/* Arco do valor, em cor cheia sobre o trilho. Ver o comentário de
            `desenhaArco` sobre o `butt`. */}
        {desenhaArco && (
          <path
            d={arcPath(START_ANGLE, valueAngle)}
            fill="none"
            stroke={valorColor}
            strokeWidth={STROKE}
            strokeLinecap="butt"
          />
        )}

        {/* Ponteiro: da base (centro do arco) até a ponta, com o pivô
            desenhado por último pra ficar por cima da linha. */}
        {temValor && (
          <>
            <line
              x1={CX}
              y1={CY}
              x2={polar(valueAngle, R - 10).x}
              y2={polar(valueAngle, R - 10).y}
              stroke="var(--text)"
              strokeWidth={2.5}
              strokeLinecap="round"
            />
            <circle cx={CX} cy={CY} r={5} fill="var(--text)" />
            <circle cx={CX} cy={CY} r={2} fill="var(--surface)" />
          </>
        )}

        {/* Valor em destaque, na faixa livre abaixo do arco — bem afastado
            do pivô do ponteiro (y=100) pra não haver colisão. */}
        <text x={CX} y={140} className={styles.svgValue} textAnchor="middle" fill={valorColor}>
          {temValor ? fmtCompact(value) : '—'}
          <tspan className={styles.svgUnit}>{temValor ? ` ${unidade}` : ''}</tspan>
        </text>
      </svg>

      <div className={styles.label}>{label}</div>

      {stats && (
        <div className={styles.stats}>
          <span className={styles.statItem}>
            <span className={styles.statKey}>mín</span>
            <span className={styles.statVal}>{fmtCompact(stats.min)}</span>
          </span>
          <span className={styles.statItem}>
            <span className={styles.statKey}>méd</span>
            <span className={styles.statVal}>{fmtCompact(stats.avg)}</span>
          </span>
          <span className={styles.statItem}>
            <span className={styles.statKey}>máx</span>
            <span className={styles.statVal}>{fmtCompact(stats.max)}</span>
          </span>
        </div>
      )}

      {trend && trend.length > 1 && <Sparkline values={trend} color={valorColor} />}
    </div>
  )
}

// Mini-gráfico de tendência sob o gauge. Escala própria (mín-máx da série)
// pra variação pequena continuar visível; é indicador de FORMA, não de
// valor absoluto — os números exatos estão no rodapé de estatísticas.
function Sparkline({ values, color, width = 200, height = 24 }) {
  const validos = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
  if (validos.length < 2) return null

  const mn = Math.min(...validos)
  const mx = Math.max(...validos)
  const range = mx - mn || 1
  const stepX = width / (values.length - 1)

  const segmentos = []
  let atual = []
  values.forEach((v, i) => {
    if (v === null || v === undefined || Number.isNaN(v)) {
      if (atual.length > 1) segmentos.push(atual)
      atual = []
      return
    }
    atual.push(
      `${(i * stepX).toFixed(1)},${(height - ((v - mn) / range) * (height - 4) - 2).toFixed(1)}`,
    )
  })
  if (atual.length > 1) segmentos.push(atual)

  return (
    <svg
      className={styles.sparkline}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {segmentos.map((pts, i) => (
        <polyline
          key={i}
          points={pts.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeOpacity={0.85}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  )
}
