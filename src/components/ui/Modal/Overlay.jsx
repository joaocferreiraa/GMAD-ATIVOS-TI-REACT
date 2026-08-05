import { createPortal } from 'react-dom'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import styles from './Overlay.module.css'

// Backdrop compartilhado por Modal/Drawer/ConfirmDialog: portal para o body,
// fecha ao clicar fora do conteúdo (equivalente ao "e.target.id===overlayId"
// do sistema original) e ao pressionar Esc.
export default function Overlay({ open, onClose, drawer = false, children }) {
  useEscapeKey(open, onClose)

  if (!open) return null

  return createPortal(
    <div
      className={`${styles.overlay} ${drawer ? styles.drawer : ''}`}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
