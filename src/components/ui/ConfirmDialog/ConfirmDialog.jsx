import Overlay from '../Modal/Overlay'
import Button from '../Button/Button'
import styles from './ConfirmDialog.module.css'

// Diálogo de confirmação (.confirm-box do sistema original — usado nas
// exclusões de ativos/estoque/instaladores/scripts/contatos).
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = true,
  onConfirm,
  onCancel,
}) {
  return (
    <Overlay open={open} onClose={onCancel}>
      <div className={styles.confirmBox}>
        {title && <h2>{title}</h2>}
        {message && <p>{message}</p>}
        <div className={styles.footer}>
          <Button onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'brand'} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </Overlay>
  )
}
