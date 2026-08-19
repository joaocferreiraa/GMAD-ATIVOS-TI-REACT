import { useState, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useMonitores } from '../../hooks/data/useMonitores'
import { useRecentMeasurements, useBucketedHistory } from '../../hooks/data/useMedicoes'
import { useRecentHostMetrics, useBucketedHostMetrics } from '../../hooks/data/useHostMetrics'
import { useAlertas } from '../../hooks/data/useAlertas'
import { computeMonitorStatus } from '../../utils/networkStatus'
import { toWideSeries, buildSeries } from '../../utils/chartSeries'
import { fmtBytes, fmtUptime, fmtPct, statsLatencia } from '../../utils/hostFormatters'
import { fmtRelTime } from '../../utils/formatters'
import {
  HISTORICO_PERIODOS,
  BUCKET_SEGUNDOS_POR_PERIODO,
  SERIE_CORES,
} from '../../constants/monitoramento'
import { ROUTES } from '../../constants/routes'
import Select from '../../components/ui/Select/Select'
import Alert from '../../components/ui/Alert/Alert'
import MultiLineChart from '../../components/charts/MultiLineChart/MultiLineChart'
import MetricStat from '../../components/monitoramento/MetricStat/MetricStat'
import StatTile from '../../components/monitoramento/StatTile/StatTile'
import UsageBar from '../../components/monitoramento/UsageBar/UsageBar'
import styles from './MonitoramentoPainelPage.module.css'

const LONG_FORMAT_PERIODOS = ['24h', '7d', '30d']
const STATUS_SEVERITY = { offline: 4, problema: 3, atencao: 2, estavel: 1, 'sem-dados': 0 }
const SAFETY_REFRESH_MS = 2 * 60 * 1000
// Acima disso, a última medição é velha o bastante pra ser um problema em
// si (o agente coleta a cada 30s) — a tela avisa em vez de exibir números
// parados como se fossem atuais, que é o pior modo de falha num painel de
// parede: ninguém percebe que congelou.
const DADOS_VELHOS_MS = 5 * 60 * 1000

// Painel de infraestrutura no formato dos dashboards de Grafana/Zabbix:
// faixa de números grandes no topo, lista de problemas ativos ao lado, e
// seções de gráficos abaixo. O LAYOUT e a densidade vêm daqueles painéis; a
// aparência é a do resto do site (mesmos tokens de cor, tema claro/escuro
// do usuário respeitado), pra não destoar do painel.
//
// Todos os números vêm de medição real: ping dos pontos monitorados
// (network_measurements) e métricas da máquina que roda o agente
// (host_metrics). Onde não há coleta, aparece "—", nunca um valor
// estimado.
export default function MonitoramentoPainelPage() {
  const [periodoValue, setPeriodoValue] = useState('6h')
  const queryClient = useQueryClient()

  // Rede de segurança pro modo TV: o Realtime já atualiza a tela quando
  // chega medição nova, mas um WebSocket que caia em silêncio (queda de
  // rede de madrugada, proxy que derruba conexão ociosa) deixaria o painel
  // congelado sem ninguém por perto pra notar. Uma revalidação periódica
  // barata garante que a tela volta a andar sozinha depois de qualquer
  // interrupção. Intervalo alto de propósito: é rede de segurança, não o
  // mecanismo principal de atualização.
  useEffect(() => {
    const id = setInterval(
      () => queryClient.invalidateQueries({ queryKey: ['monitoramento'] }),
      SAFETY_REFRESH_MS,
    )
    return () => clearInterval(id)
  }, [queryClient])

  const periodo = HISTORICO_PERIODOS.find((p) => p.value === periodoValue) ?? HISTORICO_PERIODOS[3]
  const bucketSegundos = BUCKET_SEGUNDOS_POR_PERIODO[periodoValue] ?? null

  const { data: monitores } = useMonitores()
  const { data: recentMeasurements } = useRecentMeasurements(60)
  const { data: alerts } = useAlertas({})
  const { data: hostMetrics, isError: hostError } = useRecentHostMetrics(60)

  const monitorList = monitores ?? []
  const uids = monitorList.map((m) => m.uid)

  const { data: histMedicoes } = useBucketedHistory(uids, periodo.minutes, bucketSegundos)
  const { data: histHost } = useBucketedHostMetrics(null, periodo.minutes, bucketSegundos)

  // --- Estado atual de cada ponto monitorado -------------------------------
  const measurementsByMonitor = new Map()
  ;(recentMeasurements ?? []).forEach((m) => {
    if (!m.monitorUid) return
    if (!measurementsByMonitor.has(m.monitorUid)) measurementsByMonitor.set(m.monitorUid, [])
    measurementsByMonitor.get(m.monitorUid).push(m)
  })
  measurementsByMonitor.forEach((l) =>
    l.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)),
  )

  const comStatus = monitorList.map((m) => {
    const meds = measurementsByMonitor.get(m.uid) || []
    return {
      ...m,
      statusInfo: computeMonitorStatus(meds, m.thresholds),
      ultima: meds.length ? meds[meds.length - 1] : null,
    }
  })

  const online = comStatus.filter((m) => m.statusInfo.status === 'estavel').length
  const comProblema = comStatus.filter((m) =>
    ['problema', 'offline', 'atencao'].includes(m.statusInfo.status),
  )
  const piorStatus = comStatus.reduce(
    (acc, m) =>
      STATUS_SEVERITY[m.statusInfo.status] > STATUS_SEVERITY[acc] ? m.statusInfo.status : acc,
    'sem-dados',
  )

  // Latência média entre os pontos que responderam agora — o "System load"
  // do dashboard de referência, adaptado pro que medimos.
  const latenciasAtuais = comStatus
    .map((m) => (m.ultima?.disponivel === false ? null : m.ultima?.latenciaMs))
    .filter((v) => v !== null && v !== undefined)
  const latenciaMedia = latenciasAtuais.length
    ? Math.round((latenciasAtuais.reduce((a, b) => a + b, 0) / latenciasAtuais.length) * 10) / 10
    : null

  // Disponibilidade da última hora, entre todos os pontos.
  const todasMedicoes = recentMeasurements ?? []
  const disponibilidade = todasMedicoes.length
    ? Math.round(
        (todasMedicoes.filter((m) => m.disponivel !== false).length / todasMedicoes.length) * 10000,
      ) / 100
    : null

  // --- Estado atual de cada host que roda o agente -------------------------
  // A consulta vem do mais novo pro mais antigo, então o primeiro registro
  // de cada host é o atual.
  const hostAtualPorHost = new Map()
  ;(hostMetrics ?? []).forEach((h) => {
    if (!hostAtualPorHost.has(h.host)) hostAtualPorHost.set(h.host, h)
  })
  const hosts = Array.from(hostAtualPorHost.values())

  // Medição mais recente de qualquer ponto — usada pra avisar quando a
  // coleta parou (agente fora do ar, rede caída), em vez de deixar números
  // velhos na tela parecendo atuais.
  const ultimaMedicaoIso = todasMedicoes.length
    ? todasMedicoes.reduce(
        (max, m) => (new Date(m.createdAt) > new Date(max) ? m.createdAt : max),
        todasMedicoes[0].createdAt,
      )
    : null
  const dadosVelhos = medicaoEstaVelha(ultimaMedicaoIso)

  const alertasAbertos = (alerts ?? []).filter((a) => !a.resolvido)
  const monitorNameByUid = Object.fromEntries(monitorList.map((m) => [m.uid, m.nome]))

  // --- Séries dos gráficos --------------------------------------------------
  const series = buildSeries(monitorList)
  const wideLatencia = toWideSeries(histMedicoes ?? [], 'latenciaMs')
  const widePerda = toWideSeries(histMedicoes ?? [], 'packetLossPct')
  const longFormat = LONG_FORMAT_PERIODOS.includes(periodoValue)

  // Métricas de host no formato largo (uma coluna por host).
  const hostSeries = hosts.map((h, i) => ({
    key: h.host,
    label: h.rotulo || h.host,
    color: SERIE_CORES[i % SERIE_CORES.length],
  }))
  const wideCpu = toWideSeriesHost(histHost ?? [], 'cpuPct')
  const wideMem = toWideSeriesHost(histHost ?? [], 'memPct')

  return (
    <div className={styles.page}>
      <div className={styles.topBar}>
        <div>
          <h2 className={styles.title}>Painel de Infraestrutura</h2>
          <p className={styles.subtitle}>
            Visão geral da rede e dos servidores monitorados — atualiza sozinho conforme chegam
            medições.
          </p>
        </div>
        <div className={styles.topActions}>
          <span className={`${styles.liveTag} ${dadosVelhos ? styles.liveTagStale : ''}`}>
            <span className={styles.liveDot} />
            {ultimaMedicaoIso
              ? `Medição de ${fmtRelTime(ultimaMedicaoIso)}`
              : 'Aguardando medições'}
          </span>
          <Link to={ROUTES.monitoramento} className={styles.backLink}>
            ← Monitoramento
          </Link>
          {/* Abre em outra aba: o normal é deixar a TV num monitor
              separado, sem perder a tela em que se está trabalhando. */}
          <a
            href={ROUTES.tv}
            target="_blank"
            rel="noreferrer"
            className={styles.backLink}
            title="Abre o painel em tela cheia, sem menus — para deixar num monitor de parede"
          >
            Modo TV ↗
          </a>
          <Select
            context="toolbar"
            value={periodoValue}
            onChange={setPeriodoValue}
            options={HISTORICO_PERIODOS.map((p) => ({ value: p.value, label: p.label }))}
            aria-label="Período"
          />
        </div>
      </div>

      {dadosVelhos && (
        <Alert variant="warning">
          A última medição chegou {fmtRelTime(ultimaMedicaoIso)} — o agente coleta a cada 30
          segundos. Verifique se o serviço está rodando no servidor (
          <code>nssm status GmadMonitorAgent</code>). Os números abaixo são os últimos coletados,
          não o estado atual.
        </Alert>
      )}

      {hostError && (
        <Alert variant="warning">
          As métricas de CPU/memória/disco ainda não estão disponíveis. Rode{' '}
          <code>supabase/migrations/0006_host_metrics.sql</code> no SQL Editor do Supabase e
          atualize o agente para a versão que coleta métricas do host (ver{' '}
          <code>agent/README.md</code>).
        </Alert>
      )}

      {/* Faixa superior: problemas ativos + números grandes, como no
          dashboard de referência. */}
      <div className={styles.topGrid}>
        <section className={`${styles.panel} ${styles.problemsPanel}`}>
          <h3 className={styles.panelTitle}>Problemas</h3>
          {alertasAbertos.length === 0 && comProblema.length === 0 ? (
            <p className={styles.allGood}>Nenhum problema ativo — tudo dentro dos limites.</p>
          ) : (
            <div className={styles.problemList}>
              {alertasAbertos.slice(0, 6).map((a) => (
                <div key={a.id} className={styles.problemRow}>
                  <span
                    className={`${styles.sev} ${a.severidade === 'problema' ? styles.sevDanger : styles.sevWarn}`}
                  >
                    {a.severidade === 'problema' ? 'PROBLEMA' : 'ATENÇÃO'}
                  </span>
                  <div className={styles.problemBody}>
                    <b>{monitorNameByUid[a.monitorUid] || 'Ponto removido'}</b>
                    <span>{a.mensagem}</span>
                  </div>
                  <span className={styles.problemTime}>{fmtRelTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <div className={styles.statGrid}>
          <StatTile
            label="Pontos online"
            value={monitorList.length ? `${online}/${monitorList.length}` : '—'}
            tone={piorStatus === 'estavel' ? 'ok' : piorStatus === 'sem-dados' ? 'none' : 'danger'}
          />
          <StatTile
            label="Latência média"
            value={latenciaMedia === null ? '—' : latenciaMedia}
            unidade={latenciaMedia === null ? '' : 'ms'}
            tone={latenciaMedia === null ? 'none' : latenciaMedia > 100 ? 'warn' : 'ok'}
          />
          <StatTile
            label="Disponibilidade (1h)"
            value={disponibilidade === null ? '—' : disponibilidade}
            unidade={disponibilidade === null ? '' : '%'}
            tone={
              disponibilidade === null
                ? 'none'
                : disponibilidade >= 99
                  ? 'ok'
                  : disponibilidade >= 90
                    ? 'warn'
                    : 'danger'
            }
          />
        </div>
      </div>

      {/* Um cartão por ponto: valor grande + tendência, com p95 e jitter no
          rodapé. Substituiu o velocímetro — latência de rede não preenche
          uma escala circular (links saudáveis vivem em 9-13ms num
          mostrador de 0-200), e uma latência dobrando movia a agulha ~4
          graus. Ver o comentário em MetricStat. */}
      {comStatus.length > 0 && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>Latência por ponto monitorado</h3>
          <div className={styles.statGridPontos}>
            {comStatus.map((m) => {
              const limite = m.thresholds?.latenciaMaximaMs ?? 100
              const offline = m.statusInfo.status === 'offline' || m.ultima?.disponivel === false
              const atencao = !offline && ['problema', 'atencao'].includes(m.statusInfo.status)
              const medsDoPonto = measurementsByMonitor.get(m.uid) || []
              const stats = statsLatencia(medsDoPonto)
              return (
                <MetricStat
                  key={m.uid}
                  titulo={m.nome}
                  subtitulo={m.host}
                  value={offline ? null : (m.ultima?.latenciaMs ?? null)}
                  unidade="ms"
                  limite={limite}
                  escalaTeto={limite * 2}
                  trend={medsDoPonto
                    .slice(-60)
                    .map((x) => (x.disponivel === false ? null : x.latenciaMs))}
                  tone={offline ? 'danger' : atencao ? 'warn' : 'ok'}
                  badge={offline ? 'SEM RESPOSTA' : null}
                  rodape={
                    <>
                      <span>p95 {stats?.p95 ?? '—'} ms</span>
                      <span>jitter {m.ultima?.jitterMs ?? '—'} ms</span>
                      <span>máx {stats?.max ?? '—'} ms</span>
                    </>
                  }
                />
              )
            })}
          </div>
        </section>
      )}

      {/* Uso de recursos do servidor, em barras — o "Free disk space"/
          "Available memory" do dashboard de referência. */}
      {hosts.length > 0 && (
        <section className={styles.panel}>
          <h3 className={styles.panelTitle}>
            Máquinas com agente instalado
            <span className={styles.panelHint}>
              CPU, memória e disco só existem onde o agente roda. Servidores de terceiros (banco do
              sistema, hospedagem) aparecem como pontos monitorados por ping, na seção de rede.
            </span>
          </h3>
          <div className={styles.hostGrid}>
            {hosts.map((h) => (
              <div key={h.host} className={styles.hostCard}>
                <div className={styles.hostHead}>
                  <b>{h.rotulo || h.host}</b>
                  <span className={styles.hostMeta}>
                    {h.plataforma === 'win32' ? 'Windows' : h.plataforma} · {h.cpuNucleos} núcleos ·
                    no ar há {fmtUptime(h.uptimeSegundos)}
                  </span>
                </div>
                <UsageBar label="CPU" pct={h.cpuPct} detalhe={fmtPct(h.cpuPct)} />
                <UsageBar
                  label="Memória"
                  pct={h.memPct}
                  detalhe={`${fmtBytes(h.memUsadaBytes)} / ${fmtBytes(h.memTotalBytes)}`}
                />
                <UsageBar
                  label="Disco"
                  pct={h.discoPct}
                  detalhe={`${fmtBytes(h.discoTotalBytes - h.discoLivreBytes)} / ${fmtBytes(h.discoTotalBytes)}`}
                  limites={{ warn: 80, danger: 90 }}
                />
                <span className={styles.hostUpdated}>Última coleta: {fmtRelTime(h.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Seções de gráficos, no mesmo agrupamento do dashboard de
          referência ("Server performance" / "Network"). */}
      <h3 className={styles.sectionTitle}>Desempenho da rede</h3>
      <div className={styles.chartGrid}>
        <section className={styles.panel}>
          <h4 className={styles.chartTitle}>Latência por ponto</h4>
          <MultiLineChart
            data={wideLatencia}
            series={series}
            unidade="ms"
            height={230}
            longFormat={longFormat}
            emptyMessage="Sem medições neste período."
          />
        </section>
        <section className={styles.panel}>
          <h4 className={styles.chartTitle}>Perda de pacotes por ponto</h4>
          <MultiLineChart
            data={widePerda}
            series={series}
            unidade="%"
            height={230}
            longFormat={longFormat}
            emptyMessage="Sem medições neste período."
          />
        </section>
      </div>

      <h3 className={styles.sectionTitle}>Desempenho dos servidores</h3>
      <div className={styles.chartGrid}>
        <section className={styles.panel}>
          <h4 className={styles.chartTitle}>Uso de CPU</h4>
          <MultiLineChart
            data={wideCpu}
            series={hostSeries}
            unidade="%"
            height={230}
            longFormat={longFormat}
            emptyMessage="Sem métricas de host neste período."
          />
        </section>
        <section className={styles.panel}>
          <h4 className={styles.chartTitle}>Uso de memória</h4>
          <MultiLineChart
            data={wideMem}
            series={hostSeries}
            unidade="%"
            height={230}
            longFormat={longFormat}
            emptyMessage="Sem métricas de host neste período."
          />
        </section>
      </div>
    </div>
  )
}

// Função comum (não-hook) pra isolar a chamada impura Date.now() — mesmo
// padrão de sinceIsoFor() em hooks/data/useMedicoes.js, que o React
// Compiler aceita fora do corpo do componente.
function medicaoEstaVelha(iso) {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() > DADOS_VELHOS_MS
}

// Mesma transformação de toWideSeries, mas chaveada por `host` em vez de
// `monitorUid` — métricas de máquina não têm ponto monitorado.
function toWideSeriesHost(metrics, campo) {
  const byBucket = new Map()
  for (const m of metrics) {
    if (!m.host) continue
    if (!byBucket.has(m.createdAt)) byBucket.set(m.createdAt, { bucket: m.createdAt })
    byBucket.get(m.createdAt)[m.host] = m[campo] ?? null
  }
  return Array.from(byBucket.values()).sort((a, b) => new Date(a.bucket) - new Date(b.bucket))
}
