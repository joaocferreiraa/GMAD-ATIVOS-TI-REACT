import Overlay from '../../ui/Modal/Overlay'
import { CloseIcon } from '../../ui/Icon/icons'
import styles from './Lightbox.module.css'

// Lightbox de imagens da galeria (#lightboxOverlay do sistema original).
export default function Lightbox({ open, image, onClose }) {
  return (
    <Overlay open={open} onClose={onClose} className={styles.overlay}>
      <button
        type="button"
        className={styles.close}
        onClick={onClose}
        title="Fechar"
        aria-label="Fechar"
      >
        <CloseIcon width={16} height={16} />
      </button>
      <div className={styles.content}>
        {image && <img src={image.src} alt={image.alt} />}
        <div className={styles.cap}>{image?.caption}</div>
      </div>
    </Overlay>
  )
}
