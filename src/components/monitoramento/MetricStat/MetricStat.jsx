import styles from './MetricStat.module.css'

// Painel "single stat": valor grande + linha de tendência abaixo — o
// formato padrão de painel de parede (o Stat panel do Grafana), no lugar
// do velocímetro.
//
// POR QUE NÃO VELOCÍMETRO, pra latência de rede: gauge pressupõe uma faixa
// útil que ocupe a escala inteira. Latência não tem isso — links saudáveis
// vivem em 9-13ms numa escala de 0-200ms, então as agulhas ficam todas
// coladas à esquerda e a maior parte do mostrador cobre uma faixa onde o
// dado nunca está. Pior: latência dobrando de 13 para 26ms (degradação
// clara) move a agulha ~4 graus, imperceptível. O número grande mostra
// isso na hora, e a tendência conta se está subindo.
//
// `value` null = sem medição: mostra "—", nunca 0.
// `trend`: números do mais antigo pro mais novo (null = buraco).
// `limite`: threshold configurado; desenha a linha tracejada de referência.
// `escalaTeto`: teto FIXO da sparkline. Escala fixa é essencial: com
// auto-escala (mín-máx da própria série), 1ms de ruído vira montanha e
// dois pontos com dados praticamente iguais parecem ter comportamentos
// opostos — as linhas deixam de ser comparáveis entre si.
export default function MetricStat({
  titulo,
  subtitulo = null,
  value,
  unidade = '',
  limite = null,
  escalaTeto,
  trend = null,
  tone = 'ok',
  badge = null,
  rodape = null,
}) {
  const temValor = value !== null && value !== undefined && !Number.isNaN(value)

  return (
    <div className={`${styles.card} ${styles[tone] ?? ''}`}>
      <div className={styles.head}>
        <div className={styles.headText}>
          <span className={styles.titulo}>{titulo}</span>
          {subtitulo && <span className={styles.subtitulo}>{subtitulo}</span>}
        </div>
        <div className={styles.valueBlock}>
          <span className={styles.value}>
            {temValor ? value : '—'}
            {temValor && unidade && <span className={styles.unidade}> {unidade}</span>}
          </span>
          {badge && <span className={styles.badge}>{badge}</span>}
        </div>
      </div>

      {trend && trend.length > 1 && <Sparkline values={trend} limite={limite} teto={escalaTeto} />}

      {rodape && <div className={styles.rodape}>{rodape}</div>}
    </div>
  )
}

// Linha de tendência com escala FIXA (0 -> `teto`) e marca do limite. A
// área sob a linha ajuda a leitura a distância — a curva sozinha, com 2px
// numa TV a 4 metros, quase desaparece.
function Sparkline({ values, limite, teto, width = 300, height = 52 }) {
  const validos = values.filter((v) => v !== null && v !== undefined && !Number.isNaN(v))
  if (validos.length < 2) return null

  const stepX = width / (values.length - 1)
  const escala = teto > 0 ? teto : Math.max(...validos) || 1
  const y = (v) => height - Math.min(v / escala, 1) * (height - 6) - 3

  // Buracos quebram a linha em vez de virar zero — ausência de medição não
  // é uma medição de valor 0.
  const segmentos = []
  let atual = []
  values.forEach((v, i) => {
    if (v === null || v === undefined || Number.isNaN(v)) {
      if (atual.length > 1) segmentos.push(atual)
      atual = []
      return
    }
    atual.push({ x: i * stepX, y: y(v) })
  })
  if (atual.length > 1) segmentos.push(atual)

  const yLimite = limite ? y(limite) : null
  const limiteNaFaixa = yLimite !== null && limite < escala

  return (
    <svg
      className={styles.spark}
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {limiteNaFaixa && (
        <line
          x1="0"
          y1={yLimite}
          x2={width}
          y2={yLimite}
          stroke="var(--danger)"
          strokeWidth="1"
          strokeDasharray="5 5"
          strokeOpacity="0.55"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {segmentos.map((pts, i) => (
        <g key={i}>
          <polygon
            points={`${pts[0].x},${height} ${pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')} ${pts[pts.length - 1].x},${height}`}
            fill="currentColor"
            fillOpacity="0.13"
          />
          <polyline
            points={pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </g>
      ))}
    </svg>
  )
}
