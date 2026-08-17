import MetricStat from '../MetricStat/MetricStat'
import { DEFAULT_THRESHOLDS } from '../../../constants/monitoramento'
import { statsLatencia } from '../../../utils/hostFormatters'
import styles from './LiveGauges.module.css'

// Quantos pontos a sparkline de tendência usa. 60 mostra a forma recente
// sem virar um gráfico cheio (o gráfico completo está logo abaixo, no mesmo
// card).
const TREND_POINTS = 60

// Últimos N valores de uma métrica, pra sparkline de tendência.
function trendDe(lista, campo) {
  return lista.slice(-TREND_POINTS).map((m) => {
    const v = m[campo]
    return v === undefined ? null : v
  })
}

// Leitura ATUAL do ponto selecionado em quatro números: latência, jitter,
// perda de pacotes e disponibilidade da janela. O gráfico de linha abaixo
// mostra a evolução longa; aqui é o "agora", legível de relance.
//
// Formato "single stat" (valor grande + tendência) em vez de velocímetro:
// latência de rede não preenche uma escala circular — um link saudável
// vive em 9-13ms num mostrador de 0-200ms, e uma latência DOBRANDO (sinal
// claro de degradação) movia a agulha poucos graus. Ver MetricStat.
//
// Os limites saem do que está configurado NO PRÓPRIO PONTO (ver
// MonitorFormModal), não de números fixos: 80ms é excelente num link de
// internet e ruim num switch local, então o mesmo valor pode sair verde num
// ponto e vermelho noutro. A exceção é o jitter, cujo efeito sobre voz e
// vídeo é o mesmo em qualquer link.
export default function LiveGauges({ monitor, measurements }) {
  if (!monitor) return null

  const t = { ...DEFAULT_THRESHOLDS, ...(monitor.thresholds || {}) }
  const lista = measurements ?? []

  // A lista pode vir crua (uma linha por ping, com `disponivel`) ou
  // agregada por intervalo em períodos longos (ver useMonitorHistory), que
  // não tem `disponivel` e sim `disponibilidadePct` já calculada. Os dois
  // formatos precisam funcionar porque o seletor de período do card manda
  // nos dois.
  const agregado = lista.length > 0 && lista[0].disponibilidadePct !== undefined

  // Última medição VÁLIDA (com o ponto no ar): num ponto offline, a última
  // linha não tem latência — mostrar "—" seria correto mas esconderia o
  // último valor conhecido, então preferimos o último número real medido e
  // deixamos a disponibilidade denunciar a queda.
  const ultimaValida = [...lista]
    .reverse()
    .find((m) => (agregado ? m.latenciaMs !== null : m.disponivel !== false))
  const latencia = ultimaValida?.latenciaMs ?? null
  const perda = ultimaValida?.packetLossPct ?? null

  // Disponibilidade da janela carregada (não de uma única medição, que
  // seria sempre 0% ou 100%) — mesma definição do resumo por intervalo.
  // No agregado, é a média das disponibilidades já calculadas por bucket.
  let disponibilidade = null
  if (agregado) {
    const pcts = lista.map((m) => m.disponibilidadePct).filter((v) => v !== null && v !== undefined)
    disponibilidade = pcts.length
      ? Math.round((pcts.reduce((a, b) => a + b, 0) / pcts.length) * 100) / 100
      : null
  } else if (lista.length) {
    disponibilidade =
      Math.round((lista.filter((m) => m.disponivel !== false).length / lista.length) * 10000) / 100
  }

  // A tendência de disponibilidade só existe no formato agregado (cada
  // bucket tem um %); no cru, cada medição é 0 ou 100 e a linha viraria uma
  // onda quadrada sem informação.
  const trendDisponibilidade = agregado ? trendDe(lista, 'disponibilidadePct') : null

  // Tom por faixa. Diferente do gauge, que pintava zonas na escala, aqui a
  // cor sai direto da comparação com o limite configurado no ponto.
  const toneLatencia =
    latencia === null
      ? 'none'
      : latencia > t.latenciaMaximaMs * 2
        ? 'danger'
        : latencia > t.latenciaMaximaMs
          ? 'warn'
          : 'ok'
  const tonePerda =
    perda === null
      ? 'none'
      : perda > t.packetLossMaximoPct * 2
        ? 'danger'
        : perda > t.packetLossMaximoPct
          ? 'warn'
          : 'ok'
  const toneDisp =
    disponibilidade === null
      ? 'none'
      : disponibilidade < 90
        ? 'danger'
        : disponibilidade < 99
          ? 'warn'
          : 'ok'
  // Jitter: acima de 30ms atrapalha voz/vídeo; acima de 15ms já merece
  // atenção. Referência da própria área (ITU-T G.114 e prática de VoIP),
  // não um limite configurável por ponto — o efeito é o mesmo em qualquer
  // link.
  const jitter = ultimaValida?.jitterMs ?? null
  const toneJitter = jitter === null ? 'none' : jitter > 30 ? 'danger' : jitter > 15 ? 'warn' : 'ok'

  const statsLat = statsLatencia(lista)

  return (
    <div className={styles.row}>
      <MetricStat
        titulo="Latência"
        subtitulo={`limite ${t.latenciaMaximaMs} ms`}
        value={latencia}
        unidade="ms"
        limite={t.latenciaMaximaMs}
        escalaTeto={t.latenciaMaximaMs * 2}
        trend={trendDe(lista, 'latenciaMs')}
        tone={toneLatencia}
        rodape={
          <>
            <span>p95 {statsLat?.p95 ?? '—'} ms</span>
            <span>máx {statsLat?.max ?? '—'} ms</span>
          </>
        }
      />
      {/* Jitter (variação entre pacotes): detecta link degradando antes da
          latência média subir, e é o que derruba VoIP/vídeo primeiro. */}
      <MetricStat
        titulo="Jitter"
        subtitulo="variação entre pacotes"
        value={jitter}
        unidade="ms"
        limite={15}
        escalaTeto={30}
        trend={trendDe(lista, 'jitterMs')}
        tone={toneJitter}
        rodape={<span>acima de 30 ms afeta voz e vídeo</span>}
      />
      <MetricStat
        titulo="Perda de pacotes"
        subtitulo={`limite ${t.packetLossMaximoPct}%`}
        value={perda}
        unidade="%"
        limite={t.packetLossMaximoPct}
        escalaTeto={Math.max(t.packetLossMaximoPct * 2, 4)}
        trend={trendDe(lista, 'packetLossPct')}
        tone={tonePerda}
      />
      <MetricStat
        titulo="Disponibilidade"
        subtitulo="na janela carregada"
        value={disponibilidade}
        unidade="%"
        escalaTeto={100}
        trend={trendDisponibilidade}
        tone={toneDisp}
      />
    </div>
  )
}
