import { useState, useEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useMonitores } from '../../hooks/data/useMonitores'
import { useRecentMeasurements, useBucketedHistory } from '../../hooks/data/useMedicoes'
import { useAlertas } from '../../hooks/data/useAlertas'
import { computeMonitorStatus, STATUS_LABEL } from '../../utils/networkStatus'
import { escalaLatencia, statsDe } from '../../utils/hostFormatters'
import { fmtRelTime } from '../../utils/formatters'
import { toWideSeries, buildSeries } from '../../utils/chartSeries'
import GaugeChart from '../../components/charts/GaugeChart/GaugeChart'
import MultiLineChart from '../../components/charts/MultiLineChart/MultiLineChart'
import logo from '../../assets/images/gmad-logo.png'
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

  const tudoOk = alertasAbertos.length === 0 && !dadosVelhos && online === monitorList.length

  return (
    <div className={`${styles.tv} ${dadosVelhos ? styles.stale : ''}`}>
      <header className={styles.header}>
        <div className={styles.headLeft}>
          <div className={styles.brandRow}>
            <img src={logo} alt="GMAD" className={styles.logo} />
            <h1 className={styles.title}>Monitoramento de Rede</h1>
          </div>
          <span className={`${styles.liveTag} ${dadosVelhos ? styles.liveStale : ''}`}>
            <span className={styles.liveDot} />
            {ultimaMedicaoIso
              ? dadosVelhos
                ? `COLETA PARADA — última medição ${fmtRelTime(ultimaMedicaoIso)}`
                : `Atualizado ${fmtRelTime(ultimaMedicaoIso)}`
              : 'Aguardando primeira medição'}
          </span>
        </div>
        <div className={styles.headRight}>
          <span className={styles.clock}>
            {agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <span className={styles.date}>
            {agora.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </span>
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

      {/* Velocímetros — um por ponto monitorado, grandes o suficiente pra
          leitura à distância. */}
      <div className={styles.gaugeRow}>
        {comStatus.map((m) => {
          const limite = m.thresholds?.latenciaMaximaMs ?? 100
          const escala = escalaLatencia(limite)
          const offline = m.statusInfo.status === 'offline' || m.ultima?.disponivel === false
          return (
            <div key={m.uid} className={`${styles.gaugeCell} ${offline ? styles.gaugeOffline : ''}`}>
              <GaugeChart
                value={offline ? null : (m.ultima?.latenciaMs ?? null)}
                max={escala}
                unidade="ms"
                label={m.nome}
                limite={limite}
                // Fluido: o mostrador cresce com a coluna da grade (numa TV
                // Full HD com 3 pontos, ~400px cada em vez de 260 fixos).
                fluid
                size={400}
                stats={statsDe(m.meds, 'latenciaMs')}
                trend={m.meds.slice(-40).map((x) => (x.disponivel === false ? null : x.latenciaMs))}
                zones={[
                  { ate: limite, color: 'var(--ok)' },
                  { ate: limite * 2, color: 'var(--warn)' },
                  { ate: escala, color: 'var(--danger)' },
                ]}
              />
              {offline && <span className={styles.offlineTag}>SEM RESPOSTA</span>}
              {!offline && (
                <span className={styles.gaugeStatus}>{STATUS_LABEL[m.statusInfo.status]}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Gráficos de tendência — as mesmas séries do Painel de
          Infraestrutura, em janela fixa de 6h. O velocímetro diz como está
          AGORA; o gráfico diz se está piorando, que é o que antecipa
          problema. Sem tooltip/zoom: numa TV ninguém passa o mouse. */}
      <div className={styles.chartRow}>
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Latência — últimas 6h</h2>
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
          <h2 className={styles.panelTitle}>Perda de pacotes — últimas 6h</h2>
          <MultiLineChart
            data={widePerda}
            series={seriesRede}
            unidade="%"
            height={190}
            interactive={false}
            emptyMessage="Sem medições nas últimas 6 horas."
          />
        </section>
      </div>

      <div className={styles.bottomRow}>
        {/* Alertas ativos */}
        <section className={styles.panel}>
          <h2 className={styles.panelTitle}>Alertas ativos</h2>
          {alertasAbertos.length === 0 ? (
            <p className={styles.allGood}>Nenhum alerta aberto</p>
          ) : (
            <div className={styles.alertList}>
              {alertasAbertos.slice(0, 5).map((a) => (
                <div key={a.id} className={styles.alertRow}>
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
