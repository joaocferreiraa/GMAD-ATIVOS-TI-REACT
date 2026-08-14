import Overlay from '../Modal/Overlay'
import { CloseIcon } from '../Icon/icons'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import styles from './Drawer.module.css'

// Painel lateral deslizante (.drawer-panel do sistema original — usado para
// os detalhes de Instaladores/Scripts). `wide` usa a largura maior (.drawer-panel--wide).
export default function Drawer({ open, onClose, wide = false, showCloseButton = true, children }) {
  const bindTooltip = useHoverTooltip()
  return (
    <Overlay open={open} onClose={onClose} drawer>
      <div className={`${styles.panel} ${wide ? styles.wide : ''}`}>
        {showCloseButton && (
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Fechar"
            {...bindTooltip('Fechar')}
          >
            <CloseIcon />
          </button>
        )}
        {children}
      </div>
    </Overlay>
  )
}
