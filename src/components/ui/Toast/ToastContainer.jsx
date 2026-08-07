import { createPortal } from 'react-dom'
import { useToastState } from '../../../hooks/useToastState'
import styles from './Toast.module.css'

// Renderiza a pilha de toasts ativos (equivalente ao #toastWrap original).
// Monte uma única vez, perto da raiz da aplicação.
export default function ToastContainer() {
  const { toasts } = useToastState()

  return createPortal(
    <div className={styles.wrap} role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${toast.variant === 'danger' ? styles.danger : ''}`}
        >
          {toast.message}
        </div>
      ))}
    </div>,
    document.body,
  )
}
