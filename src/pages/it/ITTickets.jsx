import { useState, useEffect, useCallback, useMemo } from 'react'
import Button from '../../components/ui/Button/Button'
import SummaryBar from '../../components/ui/SummaryBar/SummaryBar'
import Toolbar from '../../components/ui/Toolbar/Toolbar'
import SearchInput from '../../components/ui/SearchInput/SearchInput'
import Select from '../../components/ui/Select/Select'
import Table from '../../components/ui/Table/Table'
import Tabs from '../../components/ui/Tabs/Tabs'
import TableSkeleton from '../../components/ui/TableSkeleton/TableSkeleton'
import Alert from '../../components/ui/Alert/Alert'
import { useData, useItToast as useToast } from './useItContext'
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  FINAL_STATUSES,
  isITStaff,
  formatTicketNumber,
  fmtDateTime,
  slaStatus,
} from '../../config/itConfig'
import { useChamados, useInvalidateChamados } from '../../hooks/data/useChamados'
import { useRealtimeInvalidate } from '../../hooks/data/useRealtimeInvalidate'
import { queryKeys } from '../../constants/queryKeys'
import { PriorityBadge, StatusBadge, SlaBadge, SourceBadge } from './components/itBadges'
import TicketFormModal from './components/TicketFormModal'
import TicketDetailDrawer from './components/TicketDetailDrawer'
import TicketChatModal from './components/TicketChatModal'
import styles from './ITTickets.module.css'

const HOUR = 3600 * 1000

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas as prioridades' },
  ...Object.entries(TICKET_PRIORITIES)
    .sort((a, b) => a[1].order - b[1].order)
    .map(([value, cfg]) => ({ value, label: cfg.label })),
]

const CATEGORY_OPTIONS = [
  { value: '', label: 'Todas as categorias' },
  ...TICKET_CATEGORIES.map((c) => ({ value: c, label: c })),
]

export default function ITTickets() {
  const { username, userRole, group, jobTitle } = useData()
  const toast = useToast()
  const staff = isITStaff({ userRole, group, jobTitle })

  const [showForm, setShowForm] = useState(false)
  // Clicar na linha abre a conversa (o uso diário); a ficha com os dados
  // cadastrais fica atrás do "Ver detalhes" de dentro do chat.
  const [selectedId, setSelectedId] = useState(null)
  const [detailsId, setDetailsId] = useState(null)

  const [statusTab, setStatusTab] = useState('')
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [onlyMine, setOnlyMine] = useState(false)
  const [sortKey, setSortKey] = useState('created_at')
  const [sortDir, setSortDir] = useState(-1)

  // Usuários comuns veem apenas os próprios chamados.
  const {
    data,
    isPending: loading,
    error,
  } = useChamados({ requester: staff ? undefined : username })
  const tickets = useMemo(() => data ?? [], [data])

  const invalidar = useInvalidateChamados()
  const load = useCallback(() => invalidar(), [invalidar])

  // Chamado novo (o bot grava quando alguém abre pelo WhatsApp) e mudanças de
  // status/atribuição feitas por outro técnico aparecem na fila sozinhas.
  useRealtimeInvalidate('helpdesk_tickets', queryKeys.chamados)
  useRealtimeInvalidate('helpdesk_tickets', queryKeys.chamados, { event: 'UPDATE' })

  useEffect(() => {
    if (error) toast.error('Erro ao carregar chamados', error.message)
    // toast vem de um contexto e muda de identidade a cada render do
    // provider; incluí-lo aqui reabriria o aviso a cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const rows = tickets.filter((t) => {
      if (statusTab && t.status !== statusTab) return false
      if (priority && t.priority !== priority) return false
      if (category && t.category !== category) return false
      if (onlyMine && t.assignee !== username && t.requester !== username) return false
      if (q) {
        const haystack =
          `${formatTicketNumber(t.ticket_number)} ${t.title} ${t.requester_name || ''} ${t.assignee_name || ''} ${t.category}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })

    const collator = new Intl.Collator('pt-BR', { sensitivity: 'base' })
    return [...rows].sort((a, b) => {
      let cmp
      if (sortKey === 'priority') {
        cmp =
          (TICKET_PRIORITIES[a.priority]?.order ?? 0) - (TICKET_PRIORITIES[b.priority]?.order ?? 0)
      } else if (sortKey === 'created_at') {
        cmp = new Date(a.created_at) - new Date(b.created_at)
      } else if (sortKey === 'ticket_number') {
        cmp = (a.ticket_number ?? 0) - (b.ticket_number ?? 0)
      } else {
        cmp = collator.compare(a[sortKey] || '', b[sortKey] || '')
      }
      return cmp * sortDir
    })
  }, [tickets, statusTab, search, priority, category, onlyMine, username, sortKey, sortDir])

  // Instante de referência para os cálculos de tempo (SLA, "últimos 30
  // dias"). Fica em estado, e não em Date.now() dentro do useMemo, porque o
  // React Compiler recusa chamadas impuras durante o render — e assim todos
  // os recortes de tempo ficam consistentes entre si no mesmo render.
  const [agora, setAgora] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 60_000)
    return () => clearInterval(id)
  }, [])

  const kpis = useMemo(() => {
    const active = tickets.filter((t) => !FINAL_STATUSES.includes(t.status))
    const overdue = active.filter((t) => slaStatus(t).state === 'overdue').length
    const atRisk = active.filter((t) => slaStatus(t).state === 'warning').length
    const resolved30d = tickets.filter(
      (t) => t.resolved_at && agora - new Date(t.resolved_at).getTime() < 30 * 24 * HOUR,
    )
    const avgResolutionH = resolved30d.length
      ? resolved30d.reduce(
          (acc, t) => acc + (new Date(t.resolved_at) - new Date(t.created_at)),
          0,
        ) /
        resolved30d.length /
        HOUR
      : null
    const rated = tickets.filter((t) => t.rating)
    const avgRating = rated.length ? rated.reduce((a, t) => a + t.rating, 0) / rated.length : null
    return {
      active: active.length,
      open: tickets.filter((t) => t.status === 'aberto').length,
      inProgress: tickets.filter((t) => t.status === 'em_atendimento').length,
      waiting: tickets.filter((t) => t.status === 'aguardando_usuario').length,
      overdue,
      atRisk,
      resolved30d: resolved30d.length,
      avgResolutionH,
      avgRating,
      ratedCount: rated.length,
    }
  }, [tickets, agora])

  const statusTabItems = useMemo(
    () => [
      { value: '', label: 'Todos', count: tickets.length },
      ...Object.entries(TICKET_STATUSES).map(([value, cfg]) => ({
        value,
        label: cfg.label,
        count: tickets.filter((t) => t.status === value).length,
      })),
    ],
    [tickets],
  )

  const selectedTicket = tickets.find((t) => t.id === selectedId) || null
  const detailsTicket = tickets.find((t) => t.id === detailsId) || null

  function handleSort(key) {
    if (key === sortKey) setSortDir((d) => d * -1)
    else {
      setSortKey(key)
      setSortDir(1)
    }
  }

  function handleClearFilters() {
    setSearch('')
    setPriority('')
    setCategory('')
    setOnlyMine(false)
  }

  const columns = [
    {
      key: 'ticket_number',
      label: 'Nº',
      sortable: true,
      render: (t) => (
        <span className={styles.ticketNumber}>{formatTicketNumber(t.ticket_number)}</span>
      ),
    },
    {
      key: 'title',
      label: 'Título',
      sortable: true,
      render: (t) => (
        <span className={styles.titleCell}>
          <span className={styles.titleText}>{t.title}</span>
          <SourceBadge source={t.source} />
        </span>
      ),
    },
    { key: 'category', label: 'Categoria', variant: 'muted', sortable: true },
    {
      key: 'priority',
      label: 'Prioridade',
      sortable: true,
      render: (t) => <PriorityBadge priority={t.priority} />,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (t) => <StatusBadge status={t.status} />,
    },
    {
      key: 'requester_name',
      label: 'Requerente',
      sortable: true,
      render: (t) => t.requester_name || t.requester,
    },
    {
      key: 'assignee_name',
      label: 'Atribuído a',
      sortable: true,
      render: (t) => t.assignee_name || <span className={styles.empty}>—</span>,
    },
    { key: 'sla', label: 'SLA', render: (t) => <SlaBadge ticket={t} /> },
    {
      key: 'created_at',
      label: 'Aberto em',
      variant: 'muted',
      sortable: true,
      render: (t) => fmtDateTime(t.created_at),
    },
  ]

  // A faixa horizontal comporta menos itens que a antiga coluna lateral, então
  // fica com o que se acompanha durante o plantão: a fila por estado e os dois
  // alertas de SLA. Tempo médio e satisfação são indicadores de período — vivem
  // na tela de Indicadores, que é onde se olha pra trás.
  const summaryItems = [
    { label: 'Ativos', value: kpis.active },
    { label: 'Novos', value: kpis.open },
    { label: 'Em atendimento', value: kpis.inProgress },
    { label: 'Pendentes', value: kpis.waiting },
    { label: 'SLA vencido', value: kpis.overdue, tone: kpis.overdue > 0 ? 'danger' : undefined },
    { label: 'SLA em risco', value: kpis.atRisk, tone: kpis.atRisk > 0 ? 'warn' : undefined },
    { label: 'Solucionados (30 dias)', value: kpis.resolved30d, tone: 'ok' },
  ]

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Central de Chamados</h2>
          <p>
            {staff
              ? 'Gerencie todos os chamados do setor de TI.'
              : 'Abra e acompanhe seus chamados de suporte.'}
          </p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={() => setShowForm(true)}>
            + Novo chamado
          </Button>
        </div>
      </div>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por número, título, requerente, atribuído..."
        />
        <Select
          context="toolbar"
          value={priority}
          onChange={setPriority}
          options={PRIORITY_OPTIONS}
          aria-label="Prioridade"
        />
        <Select
          context="toolbar"
          value={category}
          onChange={setCategory}
          options={CATEGORY_OPTIONS}
          aria-label="Categoria"
        />
        {staff && (
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={onlyMine}
              onChange={(e) => setOnlyMine(e.target.checked)}
            />
            Somente meus
          </label>
        )}
        <Button variant="ghost" size="sm" onClick={handleClearFilters}>
          Limpar filtros
        </Button>
      </Toolbar>

      <Tabs items={statusTabItems} value={statusTab} onChange={setStatusTab} />

      {error && (
        <Alert variant="danger">
          Não foi possível carregar os chamados. Verifique sua conexão.
        </Alert>
      )}

      {loading && <TableSkeleton columns={9} />}

      {!loading && !error && (
        <>
          <SummaryBar items={summaryItems} />

          <Table
            columns={columns}
            rows={filtered}
            rowKey="id"
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            onRowClick={(t) => setSelectedId(t.id)}
            pageSize={20}
            emptyTitle="Nenhum chamado encontrado"
            emptyMessage={
              tickets.length === 0
                ? 'Você ainda não possui chamados. Abra o primeiro para receber suporte da equipe de TI.'
                : 'Nenhum chamado corresponde aos filtros selecionados.'
            }
          />
        </>
      )}

      {/* key força a remontagem a cada abertura: é assim que os campos
          nascem limpos, sem precisar resetá-los via setState dentro de
          um effect (padrão que gera render em cascata). */}
      <TicketFormModal
        key={showForm ? 'form-aberto' : 'form-fechado'}
        isOpen={showForm}
        onClose={() => setShowForm(false)}
        onCreated={() => load()}
      />

      <TicketChatModal
        key={`chat-${selectedId ?? 'sem-selecao'}`}
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedId(null)}
        onChanged={() => load()}
        onOpenDetails={() => {
          setDetailsId(selectedId)
          setSelectedId(null)
        }}
      />

      <TicketDetailDrawer
        key={`detalhes-${detailsId ?? 'sem-selecao'}`}
        ticket={detailsTicket}
        isOpen={!!detailsTicket}
        onClose={() => setDetailsId(null)}
        onChanged={() => load()}
        onOpenChat={() => {
          setSelectedId(detailsId)
          setDetailsId(null)
        }}
      />
    </div>
  )
}
