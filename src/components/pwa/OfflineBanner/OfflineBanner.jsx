import { createPortal } from 'react-dom'
import { useOnlineStatus } from '../../../hooks/pwa/useOnlineStatus'
import styles from './OfflineBanner.module.css'

// Faixa fixa no topo, sobreposta ao conteúdo (não empurra o layout) —
// aparece só enquanto o navegador reporta ausência de conexão. Os dados em
// si continuam vindo do Supabase normalmente; isso é só o aviso.
export default function OfflineBanner() {
  const online = useOnlineStatus()
  if (online) return null

  return createPortal(
    <div className={styles.banner} role="status" aria-live="assertive">
      Sem conexão com a internet. Alguns dados podem não estar disponíveis.
    </div>,
    document.body,
  )
}
