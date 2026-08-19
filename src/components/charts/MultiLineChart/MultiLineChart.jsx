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
    ? d.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    : d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Espessura de referência dos padrões de traço da prop opcional `dash`.
// Hoje nenhum consumidor passa `dash` (todas as linhas são contínuas, ver
// buildSeries), mas quem passar precisa disto: linha e traço têm que crescer
// JUNTOS. Um "2 3" desenhado com 5px de espessura e ponta arredondada tem
// cada traço esticado em 5px pelas pontas, fechando os vãos de 3px — a
// tracejada vira uma linha contínua e some justamente a distinção que ela
// existe pra criar (séries de mesmo valor se sobrepondo).
const TRACO_BASE = 2

function escalaTraco(dash, strokeWidth) {
  if (!dash) return undefined
  const fator = strokeWidth / TRACO_BASE
  return dash
    .split(' ')
    .map((n) => Number(n) * fator)
    .join(' ')
}

// Quanto a série mais grossa pode passar da base, no total. Segura o caso de
// muitos pontos monitorados: sem teto, com 6 séries a primeira ficaria uma
// faixa larga demais em vez de uma linha.
const DEGRAU_MAX = 3

// Altura da caixa da amostra na legenda, em unidades do viewBox (e em px —
// a CSS usa o mesmo valor, então a escala é 1:1 e a espessura sai em pixels
// de tela). Precisa acomodar a série MAIS GROSSA: base do Modo TV (5) mais
// DEGRAU_MAX dá 8px, e a linha é centralizada.
const LEGENDA_ALTURA = 10

// Espessura de cada série pela POSIÇÃO. Séries com o mesmo valor se
// sobrepõem exatamente e, todas contínuas e da mesma espessura, só a última
// desenhada aparece — o caso comum de "todos em 0% de perda", em que o
// gráfico passa a impressão de que só existe um ponto monitorado.
//
// Com espessuras decrescentes elas se aninham: a primeira é desenhada mais
// grossa, cada seguinte cai um degrau, e onde coincidem vê-se uma faixa
// dentro da outra, como anéis. Nenhuma linha sai do valor real — a
// alternativa comum, deslocar as coincidentes alguns pixels, faria o
// gráfico mostrar um número que não foi medido.
//
// A ÚLTIMA série fica com a espessura base (é a que sobra por cima e
// precisa continuar cheia); as anteriores engrossam. O degrau encolhe
// conforme o número de séries pra respeitar DEGRAU_MAX.
function larguraDaSerie(base, total, indice) {
  if (total < 2) return base
  const degrau = Math.min(0.9, DEGRAU_MAX / (total - 1))
  return base + (total - 1 - indice) * degrau
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
//
// `strokeWidth`: espessura BASE das linhas — a da série desenhada por
// último. As anteriores engrossam um degrau cada (ver larguraDaSerie). O
// padrão (2.5px) é o do site, para leitura sentado na frente do monitor; o
// modo TV sobe pra 5px, porque a mesma linha vista a alguns metros de
// distância vira um fio de cabelo.
export default function MultiLineChart({
  data,
  series,
  unidade = '',
  height = 260,
  band = null,
  thresholds = [],
  longFormat = false,
  interactive = true,
  strokeWidth = 2.5,
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
            Zoom: {timeLabel(view[0]?.bucket, true)} —{' '}
            {timeLabel(view[view.length - 1]?.bucket, true)}
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
                cursor={{ stroke: 'var(--border-strong)', strokeWidth: 2 }}
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
                fillOpacity={0.2}
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
                strokeWidth={2}
                strokeDasharray="6 5"
                strokeOpacity={0.85}
                label={{
                  value: t.label,
                  position: 'insideTopRight',
                  fill: 'var(--text-faint)',
                  fontSize: 10.5,
                }}
              />
            ))}

            {/* Ordem de desenho = ordem do array: a primeira (mais grossa)
                fica embaixo e a última (base) por cima. É o que produz o
                aninhamento onde as séries coincidem — inverter a ordem
                esconderia as finas dentro das grossas. */}
            {series.map((s, i) => {
              const largura = larguraDaSerie(strokeWidth, series.length, i)
              return (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  stroke={s.color}
                  strokeWidth={largura}
                  // `dash` é opcional e hoje ninguém passa — todas as linhas
                  // saem contínuas (ver buildSeries). Serve como reforço pro
                  // mesmo problema que a espessura escalonada resolve.
                  strokeDasharray={escalaTraco(s.dash, largura)}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  dot={false}
                  activeDot={
                    interactive
                      ? {
                          r: largura + 2,
                          fill: s.color,
                          stroke: 'var(--surface)',
                          strokeWidth: 2,
                        }
                      : false
                  }
                  connectNulls={false}
                  isAnimationActive={false}
                />
              )
            })}

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
          {series.map((s, i) => {
            const largura = larguraDaSerie(strokeWidth, series.length, i)
            return (
              <span key={s.key} className={styles.legendItem}>
                {/* Amostra do traço (não um quadrado de cor): reproduz a
                    linha REAL — cor, padrão e espessura. A espessura importa
                    desde que ela passou a variar por série: é aqui que se
                    descobre qual das faixas aninhadas é qual, quando as
                    linhas coincidem no gráfico. */}
                <svg
                  className={styles.legendLine}
                  viewBox={`0 0 22 ${LEGENDA_ALTURA}`}
                  aria-hidden="true"
                >
                  <line
                    x1="0"
                    y1={LEGENDA_ALTURA / 2}
                    x2="22"
                    y2={LEGENDA_ALTURA / 2}
                    stroke={s.color}
                    strokeWidth={largura}
                    strokeDasharray={escalaTraco(s.dash, largura)}
                    strokeLinecap="round"
                  />
                </svg>
                {s.label}
              </span>
            )
          })}
        </div>
      )}
      {interactive && (
        <p className={styles.hint}>Arraste sobre o gráfico para dar zoom em um intervalo.</p>
      )}
    </div>
  )
}
