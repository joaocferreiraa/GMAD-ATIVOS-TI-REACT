import Overlay from './Overlay'
import { CloseIcon } from '../Icon/icons'
import styles from './Modal.module.css'

// Modal genérico centralizado (.modal do sistema original). Fecha ao clicar
// fora, ao pressionar Esc, ou pelo X (`showCloseButton`, ligado a .view-close-btn).
export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  footer,
  showCloseButton = true,
  maxWidth,
  className = '',
  children,
}) {
  return (
    <Overlay open={open} onClose={onClose}>
      <div
        className={`${styles.modal} ${className}`}
        style={maxWidth ? { maxWidth } : undefined}
      >
        {showCloseButton && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            title="Fechar"
            aria-label="Fechar"
          >
            <CloseIcon />
          </button>
        )}
        {title && <h2>{title}</h2>}
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        {children}
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </Overlay>
  )
}
