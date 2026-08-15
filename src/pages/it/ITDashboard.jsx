import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts'
import {
  Ticket as TicketIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Hourglass,
  FileText,
} from 'lucide-react'
import { ROUTES } from '../../constants/routes'
import Card from '../../components/ui/Card/Card'
import Button from '../../components/ui/Button/Button'
import Dropdown from '../../components/ui/Dropdown/Dropdown'
import Alert from '../../components/ui/Alert/Alert'
import Loading from '../../components/ui/Loading/Loading'
import BarChart from '../../components/charts/BarChart/BarChart'
import EmptyHint from '../../components/dashboard/EmptyHint/EmptyHint'
import { useData, useItToast as useToast } from './useItContext'
import {
  TICKET_PRIORITIES,
  FINAL_STATUSES,
  formatTicketNumber,
  slaStatus,
} from '../../config/itConfig'
import { useChamados } from '../../hooks/data/useChamados'
import { PriorityBadge, StatusBadge } from './components/itBadges'
import styles from './ITDashboard.module.css'

const HOUR = 3600 * 1000
const RECENT_LIMIT = 8

// Paleta dos rankings — mesma família do dashboard principal
// (ver DashboardPage.jsx), para os dois painéis lerem igual.
const RANK_COLORS = [
  'var(--verde-700)',
  'var(--laranja)',
  'var(--verde-600)',
  'var(--verde-900)',
  'var(--laranja-forte)',
  'var(--verde-800)',
  'var(--madeira)',
]

const PERIOD_ITEMS = [
  { value: 'hoje', label: 'Hoje' },
  { value: 'mes', label: 'Este mês' },
  { value: 'ultimo_mes', label: 'Último mês' },
  { value: 'ano', label: 'Este ano' },
]

const RESUMO_TABS = [
  { id: 'categorias', label: 'Categorias', unit: 'chamados' },
  { id: 'solicitantes', label: 'Solicitantes', unit: 'chamados' },
  { id: 'setores', label: 'Setores', unit: 'chamados' },
  { id: 'unidades', label: 'Unidades', unit: 'chamados' },
]

const fmtHours = (h) => (h == null ? '—' : h < 48 ? `${h.toFixed(1)}h` : `${(h / 24).toFixed(1)}d`)

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className={styles.chartTooltip}>
      <span className={styles.chartTooltipDay}>{label}</span>
      {payload.map((entry) => (
        <span key={entry.dataKey} className={styles.chartTooltipRow}>
          <span className={styles.legendSwatch} style={{ background: entry.color }} />
          {entry.dataKey}
          <b>{entry.value}</b>
        </span>
      ))}
    </div>
  )
}

export default function ITDashboard() {
  const navigate = useNavigate()
  const toast = useToast()
  const { ALL_UNITS } = useData()

  const [period, setPeriod] = useState('mes')
  const [resumoTab, setResumoTab] = useState('categorias')

  // Uma consulta só: os indicadores e a lista de recentes saem da mesma
  // fila de chamados, calculados aqui no cliente.
  const { data, isPending: loading, error } = useChamados()
  const stats = useMemo(() => data ?? [], [data])
  const recent = useMemo(() => stats.slice(0, RECENT_LIMIT), [stats])

  useEffect(() => {
    if (error) toast.error('Erro ao carregar indicadores', error.message)
    // toast vem de um contexto e muda de identidade a cada render do
    // provider; incluí-lo aqui reabriria o aviso a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  // Instante de referência para os cálculos de tempo. Fica em estado, e não
  // em new Date() dentro dos useMemo, porque o React Compiler recusa
  // chamadas impuras durante o render — e assim os recortes de período
  // ficam consistentes entre si no mesmo render.
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Intervalo do período selecionado
  const range = useMemo(() => {
    const today = new Date(agora)
    let start, end
    switch (period) {
      case 'hoje':
        start = new Date(today)
        start.setHours(0, 0, 0, 0)
        end = new Date(start.getTime() + 24 * HOUR)
        break
      case 'ultimo_mes':
        start = new Date(today.getFullYear(), today.getMonth() - 1, 1)
        end = new Date(today.getFullYear(), today.getMonth(), 1)
        break
      case 'ano':
        start = new Date(today.getFullYear(), 0, 1)
        end = new Date(today.getFullYear() + 1, 0, 1)
        break
      case 'mes':
      default:
        start = new Date(today.getFullYear(), today.getMonth(), 1)
        end = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    }
    return { start, end }
  }, [period, agora])

  const computed = useMemo(() => {
    const inRange = (iso) => {
      if (!iso) return false
      const d = new Date(iso)
      return d >= range.start && d < range.end
    }

    const active = stats.filter((t) => !FINAL_STATUSES.includes(t.status))
    const overdue = active.filter((t) => slaStatus(t).state === 'overdue')
    const atRisk = active.filter((t) => slaStatus(t).state === 'warning')

    const created = stats.filter((t) => inRange(t.created_at))
    const resolved = stats.filter((t) => inRange(t.resolved_at))

    const avgResolutionH = resolved.length
      ? resolved.reduce((acc, t) => acc + (new Date(t.resolved_at) - new Date(t.created_at)), 0) /
        resolved.length /
        HOUR
      : null

    const rated = resolved.filter((t) => t.rating)
    const avgRating = rated.length ? rated.reduce((a, t) => a + t.rating, 0) / rated.length : null

    // SLA cumprido no período
    const resolvedWithSla = resolved.filter((t) => t.sla_due_at)
    const slaMet = resolvedWithSla.filter(
      (t) => new Date(t.resolved_at) <= new Date(t.sla_due_at),
    ).length
    const slaRate = resolvedWithSla.length ? (slaMet / resolvedWithSla.length) * 100 : null

    // BarChart espera [{ label, value }].
    const rankBy = (list, keyFn) => {
      const map = {}
      list.forEach((t) => {
        const key = keyFn(t) || 'Não informado'
        map[key] = (map[key] || 0) + 1
      })
      return Object.entries(map)
        .map(([label, value]) => ({ label, value }))
        .sort((a, b) => b.value - a.value)
    }

    const byCategory = rankBy(created, (t) => t.category)
    const byRequester = rankBy(created, (t) => t.requester_name || t.requester)
    const byUnit = rankBy(created, (t) => ALL_UNITS?.find((u) => u.id === t.unit_id)?.name || t.unit_id)
    const byDept = rankBy(created, (t) => t.department)

    const byPriority = Object.entries(TICKET_PRIORITIES)
      .sort((a, b) => a[1].order - b[1].order)
      .map(([key, cfg]) => ({
        label: cfg.label,
        value: active.filter((t) => t.priority === key).length,
        color: cfg.color,
      }))

    // Evolução diária dentro do período (máx. 92 dias)
    const days = []
    const startDay = new Date(range.start)
    const endDay = new Date(Math.min(range.end.getTime(), agora + 24 * HOUR))
    for (let d = new Date(startDay); d < endDay && days.length < 92; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d)
      const dayEnd = new Date(d.getTime() + 24 * HOUR)
      // As chaves viram o rótulo da série no tooltip e na legenda do gráfico.
      days.push({
        name: dayStart.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        Abertos: stats.filter((t) => {
          const c = new Date(t.created_at)
          return c >= dayStart && c < dayEnd
        }).length,
        Solucionados: stats.filter((t) => {
          if (!t.resolved_at) return false
          const r = new Date(t.resolved_at)
          return r >= dayStart && r < dayEnd
        }).length,
      })
    }

    const byTech = rankBy(
      resolved.filter((t) => t.assignee_name),
      (t) => t.assignee_name,
    )

    return {
      activeCount: active.length,
      inProgress: active.filter((t) => t.status === 'em_atendimento').length,
      waiting: active.filter((t) => t.status === 'aguardando_usuario').length,
      openStatus: active.filter((t) => t.status === 'aberto').length,
      overdueCount: overdue.length,
      atRiskCount: atRisk.length,
      createdCount: created.length,
      resolvedCount: resolved.length,
      avgResolutionH,
      avgRating,
      ratedCount: rated.length,
      slaRate,
      byCategory,
      byRequester,
      byUnit,
      byDept,
      byPriority,
      byTech,
      trend: days,
    }
  }, [stats, range, agora, ALL_UNITS])

  const resumoData = {
    categorias: computed.byCategory,
    solicitantes: computed.byRequester,
    setores: computed.byDept,
    unidades: computed.byUnit,
  }[resumoTab]

  const periodLabel = PERIOD_ITEMS.find((p) => p.value === period)?.label ?? 'Período'

  const kpiTiles = [
    { icon: TicketIcon, label: 'Novos', value: computed.openStatus },
    { icon: Clock, label: 'Em atendimento', value: computed.inProgress },
    { icon: Hourglass, label: 'Pendentes', value: computed.waiting },
    { icon: AlertTriangle, label: 'SLA vencido', value: computed.overdueCount, tone: 'danger' },
    { icon: AlertTriangle, label: 'SLA em risco', value: computed.atRiskCount, tone: 'warn' },
    { icon: FileText, label: 'Abertos no período', value: computed.createdCount },
    { icon: CheckCircle2, label: 'Solucionados no período', value: computed.resolvedCount },
  ]

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Indicadores de TI</h2>
          <p>Chamados, SLA e satisfação do setor.</p>
        </div>
        <div className={styles.actionsRow}>
          <Dropdown
            label={periodLabel}
            items={PERIOD_ITEMS}
            activeValue={period}
            onSelect={setPeriod}
          />
          <Button onClick={() => navigate(ROUTES.chamados)}>Central de Chamados</Button>
        </div>
      </div>

      {error && (
        <Alert variant="danger">
          Não foi possível carregar os indicadores. Verifique sua conexão.
        </Alert>
      )}

      {loading && (
        <div className={styles.state}>
          <Loading label="Carregando indicadores..." />
        </div>
      )}

      {!loading && !error && (
        <>
          <div className={styles.kpis}>
            {kpiTiles.map((tile) => (
              <div key={tile.label} className={styles.tile}>
                <div className={`${styles.tileIcon} ${styles[tile.tone ?? 'neutral']}`}>
                  <tile.icon size={18} />
                </div>
                <div className={styles.tileValue}>{tile.value}</div>
                <div className={styles.tileLabel}>{tile.label}</div>
              </div>
            ))}
          </div>

          <div className={styles.metaRow}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Tempo médio de resolução</span>
              <span className={styles.metaValue}>{fmtHours(computed.avgResolutionH)}</span>
              <span className={styles.metaSub}>{periodLabel.toLowerCase()}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>SLA cumprido</span>
              <span
                className={`${styles.metaValue} ${
                  computed.slaRate != null && computed.slaRate < 80 ? styles.metaValueDanger : ''
                }`}
              >
                {computed.slaRate == null ? '—' : `${computed.slaRate.toFixed(0)}%`}
              </span>
              <span className={styles.metaSub}>dos resolvidos no prazo</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Satisfação média</span>
              <span className={styles.metaValue}>
                {computed.avgRating == null ? '—' : `${computed.avgRating.toFixed(1)} / 5`}
              </span>
              <span className={styles.metaSub}>
                {computed.ratedCount ? `${computed.ratedCount} avaliação(ões)` : 'sem avaliações'}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Chamados ativos</span>
              <span className={styles.metaValue}>{computed.activeCount}</span>
              <span className={styles.metaSub}>em aberto agora</span>
            </div>
          </div>

          <div className={styles.grid}>
            <Card>
              <div className={styles.cardHead}>
                <div>
                  <h3>Resumo de chamados</h3>
                  <p>{computed.createdCount} chamado(s) aberto(s) no período</p>
                </div>
                <div className={styles.miniTabs}>
                  {RESUMO_TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`${styles.miniTab} ${resumoTab === tab.id ? styles.miniTabActive : ''}`}
                      onClick={() => setResumoTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
              <BarChart
                data={resumoData.slice(0, 12)}
                colors={RANK_COLORS}
                unitLabel="chamados"
                emptyMessage="Nenhum chamado no período."
              />
            </Card>

            <Card
              title="Prioridades"
              subtitle={`${computed.activeCount} chamado(s) ativo(s)`}
            >
              <BarChart
                data={computed.byPriority}
                colors={computed.byPriority.map((p) => p.color)}
                unitLabel="ativos"
                emptyMessage="Nenhum chamado ativo."
              />
            </Card>
          </div>

          <div className={styles.grid}>
            <Card title="Evolução de chamados" subtitle="Abertos × solucionados por dia">
              {computed.trend.length === 0 ? (
                <EmptyHint>Nenhum dado para o período.</EmptyHint>
              ) : (
                <>
                  <div style={{ width: '100%', height: 260 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart
                        data={computed.trend}
                        margin={{ top: 8, right: 12, bottom: 0, left: -12 }}
                      >
                        <CartesianGrid stroke="var(--border)" vertical={false} />
                        <XAxis
                          dataKey="name"
                          axisLine={false}
                          tickLine={false}
                          minTickGap={28}
                          tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
                        />
                        <YAxis
                          axisLine={false}
                          tickLine={false}
                          width={34}
                          allowDecimals={false}
                          tick={{ fill: 'var(--text-faint)', fontSize: 11 }}
                        />
                        <RechartsTooltip
                          content={<ChartTooltip />}
                          cursor={{ stroke: 'var(--border-strong)' }}
                        />
                        <Area
                          type="monotone"
                          dataKey="Abertos"
                          stroke="var(--accent)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          fill="var(--accent)"
                          fillOpacity={0.1}
                          dot={false}
                          activeDot={{
                            r: 5,
                            fill: 'var(--accent)',
                            stroke: 'var(--surface)',
                            strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                        <Area
                          type="monotone"
                          dataKey="Solucionados"
                          stroke="var(--brand)"
                          strokeWidth={2}
                          strokeLinecap="round"
                          fill="var(--brand)"
                          fillOpacity={0.1}
                          dot={false}
                          activeDot={{
                            r: 5,
                            fill: 'var(--brand)',
                            stroke: 'var(--surface)',
                            strokeWidth: 2,
                          }}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className={styles.legend}>
                    <span className={styles.legendItem}>
                      <span
                        className={styles.legendSwatch}
                        style={{ background: 'var(--accent)' }}
                      />
                      Abertos
                    </span>
                    <span className={styles.legendItem}>
                      <span className={styles.legendSwatch} style={{ background: 'var(--brand)' }} />
                      Solucionados
                    </span>
                  </div>
                </>
              )}
            </Card>

            <Card title="Técnicos" subtitle="Chamados solucionados no período">
              <BarChart
                data={computed.byTech.slice(0, 12)}
                colors={RANK_COLORS}
                unitLabel="solucionados"
                emptyMessage="Sem chamados solucionados no período."
              />
            </Card>
          </div>

          <Card title="Chamados recentes" subtitle="Os últimos registros abertos">
            {recent.length === 0 ? (
              <EmptyHint>Nenhum chamado registrado ainda.</EmptyHint>
            ) : (
              recent.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={styles.recentItem}
                  onClick={() => navigate(ROUTES.chamados)}
                >
                  <span className={styles.recentNumber}>{formatTicketNumber(t.ticket_number)}</span>
                  <span className={styles.recentTitle}>{t.title}</span>
                  <span className={styles.recentRequester}>{t.requester_name || t.requester}</span>
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </button>
              ))
            )}
          </Card>
        </>
      )}
    </div>
  )
}
