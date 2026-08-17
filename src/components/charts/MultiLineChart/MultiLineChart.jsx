import { useState } from 'react'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceArea,
  ReferenceLine,
} from 'recharts'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import styles from './MultiLineChart.module.css'

function timeLabel(iso, longFormat) {
  const d = new Date(iso)
  return longFormat
    ? d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
    : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Tooltip com TODAS as séries do instante apontado, da maior pra menor —
// comparar pontos é justamente o motivo deste gráfico existir, e ordenar
// por valor deixa o "quem está pior agora" legível sem procurar.
function MultiTooltip({ active, payload, unidade, longFormat, series }) {
  if (!active || !payload?.length) return null
  const time = payload[0]?.payload?.bucket
  const linhas = series
    .map((s) => ({ ...s, valor: payload[0]?.payload?.[s.key] }))
    .filter((l) => l.valor !== null && l.valor !== undefined)
    .sort((a, b) => b.valor - a.valor)

  return (
    <div className={styles.tooltip}>
      <span className={styles.tooltipTime}>{timeLabel(time, longFormat)}</span>
      {linhas.length ? (
        linhas.map((l) => (
          <span key={l.key} className={styles.tooltipRow}>
            <span className={styles.swatch} style={{ background: l.color }} />
            <span className={styles.tooltipLabel}>{l.label}</span>
            <span className={styles.tooltipValue}>
              {l.valor} {unidade}
            </span>
          </span>
        ))
      ) : (
        <span className={styles.tooltipEmpty}>Sem medição</span>
      )}
    </div>
  )
}

// Gráfico temporal com VÁRIAS séries sobrepostas (uma por ponto monitorado),
// zoom por arrasto e banda opcional de mín-máx — o que faltava em relação a
// Grafana/Zabbix. Mantém a estética do site (mesmos tokens de cor, mesma
// grade horizontal, sem gradiente) em vez de um tema escuro próprio.
//
// `data`: [{ bucket: isoString, [serieKey]: number|null, ... }] já ordenado
// do mais antigo pro mais novo — formato "largo" (uma coluna por série),
// que é o que o Recharts precisa pra alinhar as séries no mesmo eixo X.
// `series`: [{ key, label, color }].
// `band`: { minKey, maxKey } desenha a faixa mín-máx daquela série (só faz
// sentido com UMA série; com várias, a sobreposição de faixas vira ruído).
// `thresholds`: [{ valor, label }] linhas horizontais de limite configurado.
//
// Valores null viram buraco na linha (medição indisponível), nunca
// interpolados — mesma regra do LineChart.
// `interactive: false` desliga tooltip, zoom por arrasto e a dica de uso —
// para telas sem mouse (modo TV): nada ali seria acionável, e a legenda +
// os eixos seguem contando a história sozinhos.
export default function MultiLineChart({
  data,
  series,
  unidade = '',
  height = 260,
  band = null,
  thresholds = [],
  longFormat = false,
  interactive = true,
  emptyMessage = 'Nenhuma medição registrada neste período ainda.',
}) {
  // Zoom: guarda o intervalo selecionado (índices) e o arrasto em curso.
  const [zoom, setZoom] = useState(null)
  const [dragStart, setDragStart] = useState(null)
  const [dragEnd, setDragEnd] = useState(null)

  if (!data.length) return <EmptyHint>{emptyMessage}</EmptyHint>

  // O zoom guarda ÍNDICES, então ele só é válido pro array que estava na
  // tela quando o arrasto aconteceu. Trocar período/métrica (ou uma medição
  // nova chegando via Realtime) troca o array por baixo — sem descartar o
  // zoom obsoleto, a faixa apontaria pra outro trecho do tempo, ou pra fora
  // do array (gráfico vazio sem explicação). Fora do intervalo válido, cai
  // pro período inteiro.
  const zoomValido = zoom && zoom.end < data.length && zoom.start < zoom.end
  const view = zoomValido ? data.slice(zoom.start, zoom.end + 1) : data

  function handleMouseDown(e) {
    if (e?.activeTooltipIndex === undefined) return
    setDragStart(e.activeTooltipIndex)
    setDragEnd(e.activeTooltipIndex)
  }

  function handleMouseMove(e) {
    if (dragStart === null || e?.activeTooltipIndex === undefined) return
    setDragEnd(e.activeTooltipIndex)
  }

  // Aplica o zoom no fim do arrasto. Índices são relativos à fatia visível
  // (`view`), então somamos o início do zoom atual pra continuarem válidos
  // sobre `data` — é o que permite dar zoom várias vezes seguidas.
  function handleMouseUp() {
    if (dragStart === null || dragEnd === null || dragStart === dragEnd) {
      setDragStart(null)
      setDragEnd(null)
      return
    }
    const base = zoomValido ? zoom.start : 0
    const [a, b] = [dragStart, dragEnd].sort((x, y) => x - y)
    // Mínimo de 2 pontos: um zoom de ponto único deixaria o gráfico vazio.
    if (b - a >= 1) setZoom({ start: base + a, end: base + b })
    setDragStart(null)
    setDragEnd(null)
  }

  const dragging = dragStart !== null && dragEnd !== null && dragStart !== dragEnd

  return (
    <div className={styles.wrap}>
      {zoomValido && (
        <div className={styles.zoomBar}>
          <span className={styles.zoomInfo}>
            Zoom: {timeLabel(view[0]?.bucket, true)} — {timeLabel(view[view.length - 1]?.bucket, true)}
          </span>
          <button type="button" className={styles.zoomReset} onClick={() => setZoom(null)}>
            Ver período inteiro
          </button>
        </div>
      )}
      <div style={{ width: '100%', height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={view}
            margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
            onMouseDown={interactive ? handleMouseDown : undefined}
            onMouseMove={interactive ? handleMouseMove : undefined}
            onMouseUp={interactive ? handleMouseUp : undefined}
            // Arrasto que sai do gráfico sem soltar deixaria a seleção
            // pendurada e o próximo clique daria um zoom fantasma.
            onMouseLeave={
              interactive
                ? () => {
                    setDragStart(null)
                    setDragEnd(null)
                  }
                : undefined
            }
          >
            <CartesianGrid stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="bucket"
              tickFormatter={(v) => timeLabel(v, longFormat)}
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
            {interactive && (
              <Tooltip
                content={<MultiTooltip unidade={unidade} longFormat={longFormat} series={series} />}
                cursor={{ stroke: 'var(--border-strong)' }}
              />
            )}

            {/* Banda mín-máx: o range real dentro do intervalo agregado. Sem
                ela, a média esconde picos — um espasmo de 400ms diluído em
                4h de média some do gráfico. Desenhada primeiro pra ficar
                atrás das linhas. */}
            {band && (
              <Area
                // Range area: o Recharts desenha do primeiro ao segundo
                // valor quando dataKey devolve um par [min, max] — é assim
                // que a faixa vai do mínimo ao máximo do intervalo, e não
                // do zero até o máximo (que preencheria o gráfico inteiro).
                dataKey={(d) =>
                  d[band.minKey] === null || d[band.maxKey] === null
                    ? null
                    : [d[band.minKey], d[band.maxKey]]
                }
                stroke="none"
                fill={series[0]?.color}
                fillOpacity={0.12}
                isAnimationActive={false}
                activeDot={false}
                connectNulls={false}
              />
            )}

            {thresholds.map((t) => (
              <ReferenceLine
                key={t.label}
                y={t.valor}
                stroke="var(--danger)"
                strokeDasharray="4 4"
                strokeOpacity={0.7}
                label={{
                  value: t.label,
                  position: 'insideTopRight',
                  fill: 'var(--text-faint)',
                  fontSize: 10.5,
                }}
              />
            ))}

            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                stroke={s.color}
                strokeWidth={2}
                // Padrão de traço por série: séries com o MESMO valor se
                // sobrepõem exatamente (todos em 0% de perda, por
                // exemplo) e só a última desenhada apareceria. Tracejadas
                // diferentes se intercalam e todas seguem visíveis.
                strokeDasharray={s.dash ?? undefined}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={
                  interactive ? { r: 4, fill: s.color, stroke: 'var(--surface)', strokeWidth: 2 } : false
                }
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}

            {dragging && (
              <ReferenceArea
                x1={view[Math.min(dragStart, dragEnd)]?.bucket}
                x2={view[Math.max(dragStart, dragEnd)]?.bucket}
                fill="var(--brand)"
                fillOpacity={0.12}
                stroke="var(--brand)"
                strokeOpacity={0.4}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      {series.length > 1 && (
        <div className={styles.legend}>
          {series.map((s) => (
            <span key={s.key} className={styles.legendItem}>
              {/* Amostra do traço (não um quadrado de cor): reproduz o
                  padrão da linha, então dá pra casar legenda e gráfico
                  quando duas séries têm a mesma cor de fundo escuro. */}
              <svg className={styles.legendLine} viewBox="0 0 22 6" aria-hidden="true">
                <line
                  x1="0"
                  y1="3"
                  x2="22"
                  y2="3"
                  stroke={s.color}
                  strokeWidth="2.5"
                  strokeDasharray={s.dash ?? undefined}
                  strokeLinecap="round"
                />
              </svg>
              {s.label}
            </span>
          ))}
        </div>
      )}
      {interactive && (
        <p className={styles.hint}>Arraste sobre o gráfico para dar zoom em um intervalo.</p>
      )}
    </div>
  )
}
