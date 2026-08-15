import { useState, useCallback, useMemo } from 'react'
import Drawer from '../../../components/ui/Drawer/Drawer'
import Button from '../../../components/ui/Button/Button'
import { useData, useItToast as useToast } from '../useItContext'
import { isITStaff, formatTicketNumber } from '../../../config/itConfig'
import { addComment } from '../../../services/itService'
import { useChamadoTimeline, useInvalidateChamados } from '../../../hooks/data/useChamados'
import { useRealtimeInvalidate } from '../../../hooks/data/useRealtimeInvalidate'
import { queryKeys } from '../../../constants/queryKeys'
import { PriorityBadge, StatusBadge, SlaBadge } from './itBadges'
import TicketChat from './TicketChat'
import styles from './TicketChatModal.module.css'

// Conversa do chamado em painel lateral — é o que a equipe usa no dia a dia
// (ler o que o requerente escreveu e responder). Fica na lateral para a fila
// continuar visível ao lado; os dados cadastrais ficam atrás do
// "Ver detalhes", que abre a ficha completa.
export default function TicketChatModal({ ticket, isOpen, onClose, onOpenDetails, onChanged }) {
  const { username, name, userRole, group, jobTitle } = useData()
  const toast = useToast()
  const staff = isITStaff({ userRole, group, jobTitle })

  const [comment, setComment] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)

  const ticketId = isOpen ? ticket?.id : null
  const { data: timelineData, isFetching: loadingTimeline } = useChamadoTimeline(ticketId)
  const timeline = useMemo(() => timelineData ?? { comments: [], events: [] }, [timelineData])

  // Mensagem nova chega sozinha: o bot grava o comentário no Postgres quando o
  // requerente responde no WhatsApp, e o Realtime invalida a timeline deste
  // chamado. Sem isso a equipe só veria a resposta ao reabrir a conversa.
  // O filtro restringe ao chamado aberto — sem ele, qualquer comentário de
  // qualquer chamado recarregaria esta thread.
  useRealtimeInvalidate(
    'helpdesk_comments',
    [...queryKeys.chamadoTimeline, ticketId],
    ticketId ? { filter: `ticket_id=eq.${ticketId}` } : {},
  )

  // Status/prioridade/atribuição mudam a linha do chamado (o cabeçalho daqui e
  // a fila atrás), então observa a tabela de chamados também.
  useRealtimeInvalidate('helpdesk_tickets', queryKeys.chamados, { event: 'UPDATE' })

  const invalidar = useInvalidateChamados()
  const loadTimeline = useCallback(() => invalidar(ticketId), [invalidar, ticketId])

  const items = useMemo(() => {
    const visibleComments = timeline.comments.filter((c) => staff || !c.is_internal)
    return [
      ...visibleComments.map((c) => ({ ...c, _kind: 'comment' })),
      ...timeline.events.map((e) => ({ ...e, _kind: 'event' })),
    ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }, [timeline, staff])

  if (!ticket) return null

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
      onChanged?.()
    } catch (err) {
      toast.error('Erro ao enviar comentário', err.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <Drawer open={isOpen} onClose={onClose} wide flush>
      <div className={styles.panel}>
        <div className={styles.head}>
          <h2 className={styles.title}>
            {formatTicketNumber(ticket.ticket_number)} · {ticket.title}
          </h2>
          <div className={styles.headMeta}>
            <StatusBadge status={ticket.status} />
            <PriorityBadge priority={ticket.priority} />
            <span className={styles.headSla}>
              <SlaBadge ticket={ticket} />
            </span>
            <Button size="sm" onClick={onOpenDetails}>
              Ver detalhes
            </Button>
          </div>
        </div>

        <div className={styles.chatArea}>
          <TicketChat
            fill
            items={items}
            loading={loadingTimeline && items.length === 0}
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
      </div>
    </Drawer>
  )
}
