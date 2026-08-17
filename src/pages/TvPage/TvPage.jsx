import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMonitores } from '../../hooks/data/useMonitores'
import { useRecentMeasurements, useBucketedHistory } from '../../hooks/data/useMedicoes'
import { useAlertas } from '../../hooks/data/useAlertas'
import { computeMonitorStatus, STATUS_LABEL } from '../../utils/networkStatus'
import { statsLatencia, percentil } from '../../utils/hostFormatters'
import { fmtRelTime } from '../../utils/formatters'
import { toWideSeries, buildSeries } from '../../utils/chartSeries'
import MultiLineChart from '../../components/charts/MultiLineChart/MultiLineChart'
import MetricStat from '../../components/monitoramento/MetricStat/MetricStat'
// Versão da logo para fundo escuro: o verde da marca (#006934) tem só
// 2.84:1 de contraste sobre o fundo do painel — abaixo do mínimo de 3:1
// para elementos gráficos, ficando pesado e sem definição na TV. Esta
// versão clareia apenas o verde (9.77:1), preservando o laranja e a
// transparência.
import logo from '../../assets/images/gmad-logo-dark.png'
import styles from './TvPage.module.css'

// 45s: menor que o intervalo de coleta do agente (30s) somado a uma folga,
// e bem menor que DADOS_VELHOS_MS — a tela precisa ter várias chances de
// buscar dado fresco antes de concluir que a coleta parou, senão um
// tropeço de rede vira um "SEM COLETA" falso na parede.
const SAFETY_REFRESH_MS = 45 * 1000
// Acima disso a coleta parou (o agente mede a cada 30s) — num painel de
// parede, números velhos com cara de atuais são o pior modo de falha, então
// a tela inteira avisa em vez de seguir exibindo o último valor.
const DADOS_VELHOS_MS = 5 * 60 * 1000
const STATUS_SEVERITY = { offline: 4, problema: 3, atencao: 2, estavel: 1, 'sem-dados': 0 }
// Janela dos gráficos da TV — fixa (a tela não tem seletor de período).
const TV_JANELA_MINUTOS = 360 // 6 horas
const TV_BUCKET_SEGUNDOS = 300 // 5 min -> ~72 pontos por série

// Função comum (não-hook) pra isolar Date.now() — mesmo padrão de
// sinceIsoFor() em hooks/data/useMedicoes.js.
function estaVelha(iso) {
  if (!iso) return false
  return Date.now() - new Date(iso).getTime() > DADOS_VELHOS_MS
}

// Modo TV: o painel de monitoramento sem a casca do app (sidebar, topbar,
// rodapé), em escala grande, pensado pra ficar aberto num monitor de
// parede e ser lido a alguns metros de distância.
//
// Diferenças em relação ao Painel de Infraestrutura (/monitoramento-rede/
// painel), que é a versão pra usar sentado na frente do computador:
//   - sem navegação nem seletor de período (ninguém opera uma TV);
//   - tipografia e velocímetros maiores;
//   - relógio e indicador de coleta sempre visíveis;
//   - pontos com problema sobem pro topo da lista automaticamente;
//   - se a coleta parar, a tela inteira sinaliza — o modo de falha crítico
//     aqui é ninguém perceber que o painel congelou.
export default function TvPage() {
  const queryClient = useQueryClient()
  const [agora, setAgora] = useState(() => new Date())

  const { data: monitores } = useMonitores()
  const { data: recentMeasurements } = useRecentMeasurements(60)
  const { data: alerts } = useAlertas({})

  // Histórico dos gráficos: janela fixa de 6h, agregada em intervalos de 5
  // min (~72 pontos por série). Fixa porque ninguém opera uma TV — 6h é o
  // suficiente pra enxergar o turno de trabalho inteiro e perceber
  // degradação progressiva, sem virar uma linha achatada de 30 dias.
  //
  // A TV mostra só REDE: CPU/memória do servidor que roda o agente são
  // informação de manutenção interna, que interessa a quem administra o
  // painel — não a quem olha o monitor de parede. Esses números continuam
  // no Painel de Infraestrutura.
  const uidsMonitores = (monitores ?? []).map((m) => m.uid)
  const { data: histRede } = useBucketedHistory(uidsMonitores, TV_JANELA_MINUTOS, TV_BUCKET_SEGUNDOS)

  // Relógio da tela — num painel de parede, saber a hora exibida é o que
  // permite confiar (ou não) no resto dos números.
  useEffect(() => {
    const id = setInterval(() => setAgora(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  // Rede de segurança: o Realtime já atualiza quando chega medição nova,
  // mas um WebSocket que caia em silêncio deixaria a TV congelada sem
  // ninguém por perto pra notar — e aqui não há o resgate de
  // refetchOnWindowFocus, porque ninguém clica numa tela de parede.
  //
  // `refetchType: 'all'` é essencial: invalidateQueries sozinho apenas
  // MARCA a query como obsoleta, e o refetch automático ainda respeita o
  // staleTime global de 30s (ver App.jsx) — numa TV ociosa isso podia
  // deixar a tela sem buscar nada e disparar o falso "SEM COLETA".
  // Com 'all', a busca acontece de fato a cada ciclo.
  useEffect(() => {
    const id = setInterval(
      () => queryClient.invalidateQueries({ queryKey: ['monitoramento'], refetchType: 'all' }),
      SAFETY_REFRESH_MS,
    )
    return () => clearInterval(id)
  }, [queryClient])

  // Pinta o fundo do documento de escuro enquanto a TV está aberta: a
  // página cobre a viewport, mas o body por baixo continuaria claro (tema
  // do site) e apareceria em qualquer rolagem elástica ou barra de
  // rolagem. Restaura ao sair pra não afetar as outras telas.
  useEffect(() => {
    const anterior = document.body.style.background
    document.body.style.background = '#0d0f13'
    return () => {
      document.body.style.background = anterior
    }
  }, [])

  // Mantém a tela acesa enquanto o painel estiver aberto (Screen Wake Lock).
  // Sem isso a TV/monitor entra em descanso e o painel some. Nem todo
  // navegador suporta — quando não suporta, simplesmente não faz nada (o
  // usuário ajusta a suspensão pelo sistema operacional).
  useWakeLock()

  const monitorList = monitores ?? []
  const measurementsList = recentMeasurements ?? []

  const porMonitor = new Map()
  measurementsList.forEach((m) => {
    if (!m.monitorUid) return
    if (!porMonitor.has(m.monitorUid)) porMonitor.set(m.monitorUid, [])
    porMonitor.get(m.monitorUid).push(m)
  })
  porMonitor.forEach((l) => l.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))

  const comStatus = monitorList
    .map((m) => {
      const meds = porMonitor.get(m.uid) || []
      return {
        ...m,
        statusInfo: computeMonitorStatus(meds, m.thresholds),
        ultima: meds.length ? meds[meds.length - 1] : null,
        meds,
      }
    })
    // Pior status primeiro: numa parede, o que está errado tem que estar no
    // topo, não escondido no fim de uma lista alfabética.
    .sort((a, b) => STATUS_SEVERITY[b.statusInfo.status] - STATUS_SEVERITY[a.statusInfo.status])

  const online = comStatus.filter((m) => m.statusInfo.status === 'estavel').length
  const alertasAbertos = (alerts ?? []).filter((a) => !a.resolvido)

  // Latência média entre os pontos que responderam na última checagem —
  // resume a saúde da rede num número só, pro topo do painel. Pontos sem
  // resposta ficam de fora (não têm latência; incluí-los como zero puxaria
  // a média pra baixo e faria uma queda parecer melhora).
  const latenciasAtuais = comStatus
    .map((m) => (m.ultima?.disponivel === false ? null : m.ultima?.latenciaMs))
    .filter((v) => v !== null && v !== undefined)
  const latenciaMedia = latenciasAtuais.length
    ? Math.round((latenciasAtuais.reduce((a, b) => a + b, 0) / latenciasAtuais.length) * 10) / 10
    : null
  const monitorNameByUid = Object.fromEntries(monitorList.map((m) => [m.uid, m.nome]))

  const ultimaMedicaoIso = measurementsList.length
    ? measurementsList.reduce(
        (max, m) => (new Date(m.createdAt) > new Date(max) ? m.createdAt : max),
        measurementsList[0].createdAt,
      )
    : null
  const dadosVelhos = estaVelha(ultimaMedicaoIso)

  // Séries dos gráficos. `buildSeries` dá cor estável por posição, então a
  // cor de cada ponto não muda entre atualizações da tela.
  const seriesRede = buildSeries(monitorList)
  const wideLatencia = toWideSeries(histRede ?? [], 'latenciaMs')
  const widePerda = toWideSeries(histRede ?? [], 'packetLossPct')
  const wideDisponibilidade = toWideSeries(histRede ?? [], 'disponibilidadePct')

  // Ranking de estabilidade das últimas 6h: junta disponibilidade e
  // latência média por ponto num quadro só. Responde "qual link me deu
  // mais trabalho hoje?" — pergunta que nem o velocímetro (só o agora) nem
  // o gráfico (uma métrica por vez) respondem sozinhos.
  const resumoPorPonto = monitorList
    .map((m) => {
      const buckets = (histRede ?? []).filter((b) => b.monitorUid === m.uid)
      const disp = buckets.map((b) => b.disponibilidadePct).filter((v) => v !== null && v !== undefined)
      const lat = buckets.map((b) => b.latenciaMs).filter((v) => v !== null && v !== undefined)
      return {
        uid: m.uid,
        nome: m.nome,
        cor: seriesRede.find((s) => s.key === m.uid)?.color,
        disponibilidade: disp.length
          ? Math.round((disp.reduce((a, b) => a + b, 0) / disp.length) * 100) / 100
          : null,
        latenciaMedia: lat.length
          ? Math.round((lat.reduce((a, b) => a + b, 0) / lat.length) * 10) / 10
          : null,
        // p95: o número que a operação de rede acompanha. Média de 13ms
        // com p95 de 80ms = picos intermitentes que a média esconde e o
        // usuário sente.
        latenciaP95: percentil(lat, 95),
        latenciaPico: lat.length ? Math.round(Math.max(...lat) * 10) / 10 : null,
      }
    })
    // Pior disponibilidade primeiro: o que deu problema fica no topo.
    .sort((a, b) => (a.disponibilidade ?? 101) - (b.disponibilidade ?? 101))

  const tudoOk = alertasAbertos.length === 0 && !dadosVelhos && online === monitorList.length

  return (
    <div className={`${styles.tv} ${dadosVelhos ? styles.stale : ''}`}>
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <img src={logo} alt="GMAD" className={styles.logo} />
          <div className={styles.titleBlock}>
            <h1 className={styles.title}>Monitoramento de Rede</h1>
            <span className={`${styles.liveTag} ${dadosVelhos ? styles.liveStale : ''}`}>
              <span className={styles.liveDot} />
              {ultimaMedicaoIso
                ? dadosVelhos
                  ? `COLETA PARADA — última medição ${fmtRelTime(ultimaMedicaoIso)}`
                  : `Atualizado ${fmtRelTime(ultimaMedicaoIso)}`
                : 'Aguardando primeira medição'}
            </span>
          </div>
        </div>
        <div className={styles.headRight}>
          {/* Resumo numérico: as três respostas mais consultadas, sempre no
              mesmo lugar. Cor no valor, não no card inteiro — um bloco
              colorido grande cansa numa tela que fica ligada o dia todo. */}
          <div className={styles.headStats}>
            <div className={styles.headStat}>
              <span
                className={styles.headStatValue}
                style={{ color: online === monitorList.length ? 'var(--ok)' : 'var(--danger)' }}
              >
                {online}/{monitorList.length}
              </span>
              <span className={styles.headStatLabel}>online</span>
            </div>
            <div className={styles.headStat}>
              <span className={styles.headStatValue}>
                {latenciaMedia === null ? '—' : latenciaMedia}
                <span className={styles.clockSeconds}>{latenciaMedia === null ? '' : 'ms'}</span>
              </span>
              <span className={styles.headStatLabel}>latência méd.</span>
            </div>
            <div className={styles.headStat}>
              <span
                className={styles.headStatValue}
                style={{ color: alertasAbertos.length ? 'var(--danger)' : 'var(--text)' }}
              >
                {alertasAbertos.length}
              </span>
              <span className={styles.headStatLabel}>alertas</span>
            </div>
          </div>
          <div className={styles.clockBlock}>
            <span className={styles.clock}>
              {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              <span className={styles.clockSeconds}>
                :{String(agora.getSeconds()).padStart(2, '0')}
              </span>
            </span>
            <span className={styles.date}>
              {agora.toLocaleDateString('pt-BR', {
                weekday: 'long',
                day: '2-digit',
                month: 'long',
              })}
            </span>
          </div>
        </div>
      </header>

      {/* Faixa de status: discreta quando está tudo bem (uma pastilha), e
          só cresce quando há problema — num painel que fica ligado o dia
          todo, um bloco verde gigante permanente vira ruído e a pessoa
          para de enxergá-lo. O que precisa chamar atenção é a exceção. */}
      {dadosVelhos ? (
        <div className={`${styles.statusBanner} ${styles.bannerAlert}`}>
          <span className={styles.bannerBig}>SEM COLETA</span>
          <span className={styles.bannerSub}>
            O agente parou de enviar medições — verifique o serviço no servidor
          </span>
        </div>
      ) : tudoOk ? (
        <div className={styles.statusChip}>
          <span className={styles.chipDot} />
          Todos os {monitorList.length} pontos operando normalmente
        </div>
      ) : (
        <div className={`${styles.statusBanner} ${styles.bannerAlert}`}>
          <span className={styles.bannerBig}>
            {alertasAbertos.length > 0
              ? `${alertasAbertos.length} ALERTA${alertasAbertos.length > 1 ? 'S' : ''}`
              : 'ATENÇÃO'}
          </span>
          <span className={styles.bannerSub}>
            {online} de {monitorList.length} pontos online
          </span>
        </div>
      )}

      {/* Um cartão por ponto: valor grande + tendência. Substituiu o
          velocímetro porque latência de rede não tem faixa útil que ocupe
          uma escala circular — links saudáveis vivem em 9-13ms num
          mostrador de 0-200, então todas as agulhas ficavam coladas à
          esquerda e uma latência DOBRANDO movia a agulha ~4 graus. O
          número grande mostra isso na hora (ver MetricStat). */}
      <div className={styles.statRow}>
        {comStatus.map((m) => {
          const limite = m.thresholds?.latenciaMaximaMs ?? 100
          const offline = m.statusInfo.status === 'offline' || m.ultima?.disponivel === false
          const atencao = !offline && ['problema', 'atencao'].includes(m.statusInfo.status)
          const stats = statsLatencia(m.meds)
          const jitter = m.ultima?.jitterMs

          return (
            <MetricStat
              key={m.uid}
              titulo={m.nome}
              subtitulo={m.host}
              value={offline ? null : (m.ultima?.latenciaMs ?? null)}
              unidade="ms"
              limite={limite}
              // Teto fixo em 2x o limite: escala comparável entre pontos e
              // ruído de 1ms deixa de virar montanha na sparkline.
              escalaTeto={limite * 2}
              trend={m.meds.slice(-60).map((x) => (x.disponivel === false ? null : x.latenciaMs))}
              tone={offline ? 'danger' : atencao ? 'warn' : 'ok'}
              badge={offline ? 'SEM RESPOSTA' : null}
              rodape={
                <>
                  {/* p95 em vez de média: a média esconde picos
                      intermitentes que o usuário sente. Ver percentil() em
                      utils/hostFormatters.js. */}
                  <span>p95 {stats?.p95 ?? '—'} ms</span>
                  <span>jitter {jitter ?? '—'} ms</span>
                  <span>{STATUS_LABEL[m.statusInfo.status]}</span>
                </>
              }
            />
          )
        })}
      </div>

      {/* Gráficos de tendência — as mesmas séries do Painel de
          Infraestrutura, em janela fixa de 6h. O velocímetro diz como está
          AGORA; o gráfico diz se está piorando, que é o que antecipa
          problema. Sem tooltip/zoom: numa TV ninguém passa o mouse. */}
      <div className={styles.chartRow}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Latência</h2>
            <span className={styles.panelMeta}>últimas 6h</span>
          </div>
          <MultiLineChart
            data={wideLatencia}
            series={seriesRede}
            unidade="ms"
            height={190}
            interactive={false}
            emptyMessage="Sem medições nas últimas 6 horas."
          />
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Perda de pacotes</h2>
            <span className={styles.panelMeta}>últimas 6h</span>
          </div>
          <MultiLineChart
            data={widePerda}
            series={seriesRede}
            unidade="%"
            height={190}
            interactive={false}
            emptyMessage="Sem medições nas últimas 6 horas."
          />
        </section>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Disponibilidade</h2>
            <span className={styles.panelMeta}>últimas 6h</span>
          </div>
          <MultiLineChart
            data={wideDisponibilidade}
            series={seriesRede}
            unidade="%"
            height={190}
            interactive={false}
            emptyMessage="Sem medições nas últimas 6 horas."
          />
        </section>
        {/* Quadro-resumo: junta disponibilidade e latência por ponto, que
            os gráficos mostram separados. É onde se lê "qual link deu mais
            trabalho hoje" de uma olhada. */}
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Resumo por ponto</h2>
            <span className={styles.panelMeta}>últimas 6h</span>
          </div>
          {resumoPorPonto.length === 0 || resumoPorPonto.every((r) => r.disponibilidade === null) ? (
            <p className={styles.allGood}>Sem dados suficientes no período.</p>
          ) : (
            <table className={styles.resumoTable}>
              <thead>
                <tr>
                  <th>Ponto</th>
                  <th>Disponib.</th>
                  <th>Latência méd.</th>
                  <th>p95</th>
                  <th>Pico</th>
                </tr>
              </thead>
              <tbody>
                {resumoPorPonto.map((r) => (
                  <tr key={r.uid}>
                    <td>
                      <span className={styles.resumoDot} style={{ background: r.cor }} />
                      {r.nome}
                    </td>
                    <td
                      style={{
                        color:
                          r.disponibilidade === null
                            ? 'var(--text-faint)'
                            : r.disponibilidade >= 99.5
                              ? 'var(--ok)'
                              : r.disponibilidade >= 95
                                ? 'var(--warn)'
                                : 'var(--danger)',
                      }}
                    >
                      {r.disponibilidade === null ? '—' : `${r.disponibilidade}%`}
                    </td>
                    <td>{r.latenciaMedia === null ? '—' : `${r.latenciaMedia} ms`}</td>
                    <td>{r.latenciaP95 === null ? '—' : `${r.latenciaP95} ms`}</td>
                    <td>{r.latenciaPico === null ? '—' : `${r.latenciaPico} ms`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>

      <div className={styles.bottomRow}>
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <h2 className={styles.panelTitle}>Alertas ativos</h2>
            <span className={styles.panelMeta}>
              {alertasAbertos.length > 0 ? `${alertasAbertos.length} aberto(s)` : 'nenhum'}
            </span>
          </div>
          {alertasAbertos.length === 0 ? (
            <p className={styles.allGood}>
              <span className={styles.allGoodIcon}>✓</span>
              Nenhum alerta aberto
            </p>
          ) : (
            <div className={styles.alertList}>
              {alertasAbertos.slice(0, 4).map((a) => (
                <div
                  key={a.id}
                  className={`${styles.alertRow} ${a.severidade === 'problema' ? '' : styles.alertRowWarn}`}
                >
                  <span
                    className={`${styles.sev} ${a.severidade === 'problema' ? styles.sevDanger : styles.sevWarn}`}
                  >
                    {a.severidade === 'problema' ? 'PROBLEMA' : 'ATENÇÃO'}
                  </span>
                  <div className={styles.alertBody}>
                    <b>{monitorNameByUid[a.monitorUid] || 'Ponto removido'}</b>
                    <span>{a.mensagem}</span>
                  </div>
                  <span className={styles.alertTime}>{fmtRelTime(a.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Rodapé: legenda das cores (quem passa pela sala nem sempre sabe o
          que verde/âmbar/vermelho significam aqui) e a origem do dado — um
          painel sem procedência convida a desconfiar do número. */}
      <footer className={styles.footer}>
        <div className={styles.footerLegend}>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: 'var(--ok)' }} />
            Dentro do limite
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: 'var(--warn)' }} />
            Acima do limite configurado
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: 'var(--danger)' }} />
            Sem resposta
          </span>
        </div>
        <span>Medição real por ping a cada 30s · GMAD TI</span>
      </footer>
    </div>
  )
}

// Mantém a tela acesa (Screen Wake Lock API). Reativa depois que a aba
// volta a ficar visível — o navegador libera o lock sozinho ao minimizar,
// e sem reativar a TV apagaria na primeira troca de foco.
function useWakeLock() {
  const lockRef = useRef(null)

  useEffect(() => {
    if (!('wakeLock' in navigator)) return undefined
    let cancelado = false

    async function pedir() {
      try {
        const lock = await navigator.wakeLock.request('screen')
        if (cancelado) {
          lock.release()
          return
        }
        lockRef.current = lock
      } catch {
        // Navegador pode recusar (aba em background, política do sistema) —
        // não é erro fatal: a TV só volta a depender da configuração de
        // suspensão do próprio sistema operacional.
      }
    }

    function aoVoltar() {
      if (document.visibilityState === 'visible') pedir()
    }

    pedir()
    document.addEventListener('visibilitychange', aoVoltar)

    return () => {
      cancelado = true
      document.removeEventListener('visibilitychange', aoVoltar)
      lockRef.current?.release().catch(() => {})
      lockRef.current = null
    }
  }, [])
}
