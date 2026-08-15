import { useEffect, useRef } from 'react'
import { Send, Lock } from 'lucide-react'
import Button from '../../../components/ui/Button/Button'
import Input from '../../../components/ui/Input/Input'
import Loading from '../../../components/ui/Loading/Loading'
import { TICKET_STATUSES, TICKET_PRIORITIES, fmtDateTime } from '../../../config/itConfig'
import styles from './TicketChat.module.css'

const EVENT_LABELS = {
  criacao: () => 'abriu o chamado',
  status: (e) =>
    `alterou o status de "${TICKET_STATUSES[e.from_value]?.label || e.from_value || '—'}" para "${TICKET_STATUSES[e.to_value]?.label || e.to_value}"`,
  prioridade: (e) =>
    `alterou a prioridade de "${TICKET_PRIORITIES[e.from_value]?.label || e.from_value || '—'}" para "${TICKET_PRIORITIES[e.to_value]?.label || e.to_value}"`,
  atribuicao: (e) => `atribuiu o chamado para ${e.to_value}`,
  avaliacao: (e) => `avaliou o atendimento: ${e.to_value}`,
}

// Só a hora quando a mensagem é de hoje (como no WhatsApp); data completa
// quando é mais antiga.
function messageTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  const hoje = new Date()
  const mesmoDia =
    d.getDate() === hoje.getDate() &&
    d.getMonth() === hoje.getMonth() &&
    d.getFullYear() === hoje.getFullYear()
  return mesmoDia
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : fmtDateTime(iso)
}

// Conversa do chamado. `items` já vem ordenado e com `_kind` ('comment' |
// 'event') definido pelo componente pai.
//
// Lado da bolha: mensagem do requerente à esquerda, da equipe à direita —
// independente de quem está olhando. Assim o técnico vê a thread do mesmo
// jeito que ela chega no WhatsApp do requerente, que é o ponto de usar este
// formato aqui.
export default function TicketChat({
  items,
  loading,
  requester,
  canComment,
  comment,
  onCommentChange,
  isInternal,
  onInternalChange,
  onSend,
  sending,
  staff,
  deliversToWhatsApp,
  // No modal de chat dedicado a conversa ocupa a altura livre; embutida na
  // ficha, ela fica num bloco de altura fixa.
  fill = false,
}) {
  const threadRef = useRef(null)
  // Só rola sozinho se o leitor já estava no fim. Sem isso, uma mensagem
  // chegando pelo Realtime arrancaria da tela quem está lendo o histórico
  // mais acima.
  const stickToBottomRef = useRef(true)

  function handleScroll(event) {
    const el = event.currentTarget
    const distanciaDoFim = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distanciaDoFim < 60
  }

  // Abre a conversa já no fim (mensagem mais recente), como qualquer
  // mensageiro, e acompanha cada mensagem nova que chega.
  useEffect(() => {
    const el = threadRef.current
    if (el && stickToBottomRef.current) el.scrollTop = el.scrollHeight
  }, [items.length, loading])

  return (
    <>
      <div
        className={`${styles.thread} ${fill ? styles.threadFill : ''}`}
        ref={threadRef}
        onScroll={handleScroll}
      >
        {loading ? (
          <div className={styles.loading}>
            <Loading />
          </div>
        ) : items.length === 0 ? (
          <div className={styles.empty}>Nenhuma mensagem ainda.</div>
        ) : (
          items.map((item) => {
            if (item._kind === 'event') {
              const describe = EVENT_LABELS[item.event_type] || (() => item.event_type)
              return (
                <div key={`e-${item.id}`} className={styles.event}>
                  <span className={styles.eventAuthor}>{item.author_name || item.author}</span>{' '}
                  {describe(item)} · {messageTime(item.created_at)}
                </div>
              )
            }

            const fromRequester = item.author === requester
            return (
              <div
                key={`c-${item.id}`}
                className={`${styles.row} ${fromRequester ? styles.rowIn : styles.rowOut}`}
              >
                <div
                  className={`${styles.bubble} ${item.is_internal ? styles.bubbleInternal : ''}`}
                >
                  {item.content}
                </div>
                <div className={styles.meta}>
                  <span className={styles.author}>{item.author_name || item.author}</span>
                  {item.is_internal && (
                    <span className={styles.internalTag}>
                      <Lock size={10} /> só TI
                    </span>
                  )}
                  <span>{messageTime(item.created_at)}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {canComment && (
        <div className={styles.composer}>
          <Input
            as="textarea"
            rows={3}
            placeholder={
              isInternal
                ? 'Nota interna — o requerente não recebe esta mensagem'
                : 'Escreva uma resposta...'
            }
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
          />
          <div className={styles.composerRow}>
            {staff && (
              <label className={styles.internalCheck}>
                <input
                  type="checkbox"
                  checked={isInternal}
                  onChange={(e) => onInternalChange(e.target.checked)}
                />
                <Lock size={12} /> Nota interna (visível só para TI)
              </label>
            )}
            {!isInternal && deliversToWhatsApp && (
              <span className={styles.deliveryHint}>Será enviada ao WhatsApp do requerente</span>
            )}
            <Button
              size="sm"
              variant="primary"
              className={styles.send}
              onClick={() => {
                // Mandar uma mensagem sempre leva pro fim, mesmo se estava
                // lendo o histórico mais acima.
                stickToBottomRef.current = true
                onSend()
              }}
              disabled={sending || !comment.trim()}
            >
              <Send size={13} /> {sending ? 'Enviando...' : 'Enviar'}
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
