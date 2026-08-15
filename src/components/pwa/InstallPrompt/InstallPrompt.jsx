import { createPortal } from 'react-dom'
import { useInstallPrompt } from '../../../hooks/pwa/useInstallPrompt'
import { useIosInstallHint } from '../../../hooks/pwa/useIosInstallHint'
import { CloseIcon, ShareIcon } from '../../ui/Icon/icons'
import Button from '../../ui/Button/Button'
import styles from './InstallPrompt.module.css'

// Aviso discreto, fixo no canto inferior. Duas variantes mutuamente
// exclusivas:
// - Chrome/Android: botão "Instalar" (dispara o beforeinstallprompt nativo).
// - Safari/iOS: instrução manual (Compartilhar → Adicionar à Tela de
//   Início), já que o iOS não tem esse evento nem instalação programática.
// Nunca aparece como pop-up bloqueante.
export default function InstallPrompt() {
  const { canInstall, promptInstall, dismiss } = useInstallPrompt()
  const { canShowHint, dismiss: dismissIosHint } = useIosInstallHint()

  if (canInstall) {
    return createPortal(
      <div className={styles.wrap} role="status">
        <span className={styles.label}>Instalar TI GMAD</span>
        <div className={styles.actions}>
          <Button variant="brand" size="sm" onClick={promptInstall}>
            Instalar
          </Button>
          <button
            type="button"
            className={styles.dismiss}
            onClick={dismiss}
            aria-label="Dispensar aviso de instalação"
          >
            <CloseIcon width={14} height={14} />
          </button>
        </div>
      </div>,
      document.body,
    )
  }

  if (canShowHint) {
    return createPortal(
      <div className={styles.wrap} role="status">
        <span className={styles.hintIcon}>
          <ShareIcon width={18} height={18} />
        </span>
        <div className={styles.hintText}>
          <span className={styles.label}>Instalar TI GMAD</span>
          <p className={styles.hint}>
            Toque em Compartilhar e depois em "Adicionar à Tela de Início".
          </p>
        </div>
        <button
          type="button"
          className={styles.dismiss}
          onClick={dismissIosHint}
          aria-label="Dispensar aviso de instalação"
        >
          <CloseIcon width={14} height={14} />
        </button>
      </div>,
      document.body,
    )
  }

  return null
}
