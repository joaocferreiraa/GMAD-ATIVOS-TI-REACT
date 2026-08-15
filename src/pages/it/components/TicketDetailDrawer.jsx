import { useState, useCallback, useMemo } from 'react'
import { Star, UserCheck, RotateCcw, MessageSquare } from 'lucide-react'
import Modal from '../../../components/ui/Modal/Modal'
import Button from '../../../components/ui/Button/Button'
import Select from '../../../components/ui/Select/Select'
import Input from '../../../components/ui/Input/Input'
import FormField from '../../../components/ui/FormField/FormField'
import ViewRow from '../../../components/ui/ViewRow/ViewRow'
import { useData, useItToast as useToast } from '../useItContext'
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  FINAL_STATUSES,
  isITStaff,
  formatTicketNumber,
  fmtDateTime,
} from '../../../config/itConfig'
import {
  addComment,
  changeStatus,
  changePriority,
  assignTicket,
  rateTicket,
} from '../../../services/itService'
import { useChamadoTimeline, useInvalidateChamados } from '../../../hooks/data/useChamados'
import { PriorityBadge, StatusBadge, SlaBadge, SourceBadge } from './itBadges'
import TicketChat from './TicketChat'
import styles from './TicketDetailModal.module.css'

const STATUS_OPTIONS = Object.entries(TICKET_STATUSES).map(([value, cfg]) => ({
  value,
  label: cfg.label,
}))

const PRIORITY_OPTIONS = Object.entries(TICKET_PRIORITIES)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([value, cfg]) => ({ value, label: cfg.label }))

export default function TicketDetailDrawer({ ticket, isOpen, onClose, onChanged, onOpenChat }) {
  const { username, name, userRole, group, jobTitle, users } = useData()
  const toast = useToast()

  const staff = isITStaff({ userRole, group, jobTitle })
  const isRequester = ticket?.requester === username

  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  const [acting, setActing] = useState(false)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingHover, setRatingHover] = useState(0)
  const [ratingComment, setRatingComment] = useState('')

  // Os campos de composição (comentário, avaliação) já nascem vazios a cada
  // abertura porque o pai remonta este componente com key={ticket.id}.
  const ticketId = isOpen ? ticket?.id : null
  const { data: timelineData, isFetching: loadingTimeline } = useChamadoTimeline(ticketId)
  const timeline = useMemo(() => timelineData ?? { comments: [], events: [] }, [timelineData])

  const invalidar = useInvalidateChamados()
  const loadTimeline = useCallback(() => invalidar(ticketId), [invalidar, ticketId])

  // Técnicos de TI disponíveis para atribuição
  const itStaffUsers = useMemo(() => {
    const list = (users || []).filter((u) => isITStaff(u))
    // Garante que o responsável atual apareça na lista mesmo que ele não
    // esteja mais entre os técnicos (saiu da equipe, por exemplo).
    const faltaResponsavel = ticket?.assignee && !list.some((u) => u.username === ticket.assignee)
    return faltaResponsavel
      ? [...list, { username: ticket.assignee, name: ticket.assignee_name }]
      : list
  }, [users, ticket])

  // Timeline unificada: comentários + eventos, ordenados por data
  const items = useMemo(() => {
    const visibleComments = timeline.comments.filter((c) => staff || !c.is_internal)
    return [
      ...visibleComments.map((c) => ({ ...c, _kind: 'comment' })),
      ...timeline.events.map((e) => ({ ...e, _kind: 'event' })),
    ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [timeline, staff])

  if (!ticket) return null

  const isFinal = FINAL_STATUSES.includes(ticket.status)
  const canRate = isRequester && ['resolvido', 'fechado'].includes(ticket.status) && !ticket.rating

  const act = async (fn, successMsg) => {
    setActing(true)
    try {
      await fn()
      if (successMsg) toast.success(successMsg)
      onChanged?.()
      loadTimeline()
    } catch (err) {
      console.error('[TicketDetail]', err)
      toast.error('Erro ao atualizar chamado', err.message)
    } finally {
      setActing(false)
    }
  }

  const handleSendComment = async () => {
    if (!comment.trim()) return
    setSending(true)
    try {
      await addComment(ticket.id, {
        author: username,
        authorName: name,
        content: comment.trim(),
        isInternal,
      })
      setComment('')
      setIsInternal(false)
      loadTimeline()
    } catch (err) {
      toast.error('Erro ao enviar comentário', err.message)
    } finally {
      setSending(false)
    }
  }

  const assigneeOptions = [
    { value: '', label: 'Não atribuído' },
    ...itStaffUsers.map((u) => ({ value: u.username, label: u.name || u.username })),
  ]

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title={`${formatTicketNumber(ticket.ticket_number)} · ${ticket.title}`}
      maxWidth="760px"
    >
      <div className={styles.body}>
        <div className={styles.headerRow}>
          <div className={styles.badges}>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
          </div>
          <SlaBadge ticket={ticket} />
        </div>

        {staff && (
          <div className={styles.section}>
            <div className={styles.actions}>
              <FormField label="Status">
                <Select
                  value={ticket.status}
                  disabled={acting}
                  options={STATUS_OPTIONS}
                  onChange={(value) =>
                    act(() => changeStatus(ticket, value, username, name), 'Status atualizado')
                  }
                  aria-label="Status do chamado"
                />
              </FormField>
              <FormField label="Prioridade">
                <Select
                  value={ticket.priority}
                  disabled={acting}
                  options={PRIORITY_OPTIONS}
                  onChange={(value) =>
                    act(
                      () => changePriority(ticket, value, username, name),
                      'Prioridade atualizada',
                    )
                  }
                  aria-label="Prioridade do chamado"
                />
              </FormField>
              <FormField label="Atribuído a">
                <Select
                  value={ticket.assignee || ''}
                  disabled={acting}
                  options={assigneeOptions}
                  onChange={(value) => {
                    const u = itStaffUsers.find((x) => x.username === value)
                    act(
                      () =>
                        assignTicket(
                          ticket,
                          value || null,
                          u?.name || u?.username || null,
                          username,
                          name,
                        ),
                      'Atribuição atualizada',
                    )
                  }}
                  aria-label="Técnico atribuído"
                />
              </FormField>

              {((ticket.assignee !== username && !isFinal) ||
                (isFinal && ticket.status !== 'cancelado')) && (
                <div className={styles.actionsFull}>
                  {ticket.assignee !== username && !isFinal && (
                    <Button
                      size="sm"
                      disabled={acting}
                      onClick={() =>
                        act(
                          () => assignTicket(ticket, username, name, username, name),
                          'Chamado assumido',
                        )
                      }
                    >
                      <UserCheck size={14} /> Assumir chamado
                    </Button>
                  )}
                  {isFinal && ticket.status !== 'cancelado' && (
                    <Button
                      size="sm"
                      disabled={acting}
                      onClick={() =>
                        act(
                          () => changeStatus(ticket, 'aberto', username, name),
                          'Chamado reaberto',
                        )
                      }
                    >
                      <RotateCcw size={14} /> Reabrir chamado
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Requerente sem ser da equipe também pode reabrir o próprio chamado —
            para ele não existe o painel de ações acima. */}
        {!staff && isFinal && ticket.status !== 'cancelado' && isRequester && (
          <div className={styles.section}>
            <Button
              size="sm"
              disabled={acting}
              onClick={() =>
                act(() => changeStatus(ticket, 'aberto', username, name), 'Chamado reaberto')
              }
            >
              <RotateCcw size={14} /> Reabrir chamado
            </Button>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Dados do chamado</h3>
          <div className={styles.rows}>
            <ViewRow label="Requerente" value={ticket.requester_name || ticket.requester} />
            <ViewRow label="Origem" value={<SourceBadge source={ticket.source} />} raw />
            <ViewRow label="Setor" value={ticket.department} />
            <ViewRow label="Categoria" value={ticket.category} />
            <ViewRow label="Local" value={ticket.location} />
            <ViewRow label="Atribuído a" value={ticket.assignee_name || 'Não atribuído'} raw />
            <ViewRow label="Aberto em" value={fmtDateTime(ticket.created_at)} raw />
            <ViewRow label="Prazo SLA" value={fmtDateTime(ticket.sla_due_at)} raw />
            <ViewRow label="Solucionado em" value={fmtDateTime(ticket.resolved_at)} raw />
          </div>
        </div>

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Descrição</h3>
          <div className={styles.description}>{ticket.description}</div>
        </div>

        {canRate && (
          <div className={styles.section}>
            <div className={styles.ratePanel}>
              <div className={styles.rateTitle}>
                Como você avalia o atendimento deste chamado?
              </div>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    className={`${styles.starBtn} ${(ratingHover || ratingValue) >= n ? styles.starOn : ''}`}
                    onClick={() => setRatingValue(n)}
                    onMouseEnter={() => setRatingHover(n)}
                    onMouseLeave={() => setRatingHover(0)}
                    aria-label={`${n} estrela(s)`}
                  >
                    <Star
                      size={26}
                      fill={(ratingHover || ratingValue) >= n ? 'currentColor' : 'transparent'}
                    />
                  </button>
                ))}
              </div>
              <Input
                as="textarea"
                rows={2}
                placeholder="Comentário sobre o atendimento (opcional)"
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
              />
              <Button
                size="sm"
                variant="primary"
                style={{ marginTop: 12 }}
                disabled={!ratingValue || acting}
                onClick={() =>
                  act(
                    () => rateTicket(ticket, ratingValue, ratingComment, username, name),
                    'Obrigado pela avaliação!',
                  )
                }
              >
                Enviar avaliação
              </Button>
            </div>
          </div>
        )}

        {ticket.rating && (
          <div className={styles.section}>
            <div className={styles.rateGiven}>
              <span className={styles.rateGivenLabel}>Avaliação:</span>
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  size={16}
                  className={ticket.rating >= n ? styles.starOn : undefined}
                  fill={ticket.rating >= n ? 'currentColor' : 'transparent'}
                  color={ticket.rating >= n ? undefined : 'var(--text-faint)'}
                />
              ))}
              {ticket.rating_comment && (
                <span className={styles.rateComment}>&ldquo;{ticket.rating_comment}&rdquo;</span>
              )}
            </div>
          </div>
        )}

        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>Conversa</h3>
          <TicketChat
            items={items}
            loading={loadingTimeline}
            requester={ticket.requester}
            canComment={ticket.status !== 'cancelado'}
            comment={comment}
            onCommentChange={setComment}
            isInternal={isInternal}
            onInternalChange={setIsInternal}
            onSend={handleSendComment}
            sending={sending}
            staff={staff}
            deliversToWhatsApp={ticket.source === 'whatsapp'}
          />
        </div>

        {onOpenChat && (
          <div className={styles.section}>
            <Button size="sm" onClick={onOpenChat}>
              <MessageSquare size={14} /> Abrir conversa em tela cheia
            </Button>
          </div>
        )}
      </div>
    </Modal>
  )
}
