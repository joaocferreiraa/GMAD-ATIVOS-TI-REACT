import { createPortal } from 'react-dom'
import { useEffect, useRef } from 'react'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import { useLockBodyScroll } from '../../../hooks/overlay/useLockBodyScroll'
import styles from './Overlay.module.css'

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Backdrop compartilhado por Modal/Drawer/ConfirmDialog/Lightbox: portal para
// o body, fecha ao clicar fora do conteúdo (equivalente ao
// "e.target.id===overlayId" do sistema original) e ao pressionar Esc.
// role="dialog"/aria-modal e o trap de foco ficam aqui, sem mexer no CSS,
// pra não alterar o layout de nenhum consumidor.
export default function Overlay({ open, onClose, drawer = false, className = '', children }) {
  useEscapeKey(open, onClose)
  useLockBodyScroll(open)
  const overlayRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined

    const previouslyFocused = document.activeElement
    const node = overlayRef.current
    const focusable = node?.querySelectorAll(FOCUSABLE_SELECTOR)
    ;(focusable?.[0] ?? node)?.focus()

    function handleKeyDown(event) {
      if (event.key !== 'Tab' || !node) return
      const items = Array.from(node.querySelectorAll(FOCUSABLE_SELECTOR))
      if (!items.length) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      ref={overlayRef}
      className={`${styles.overlay} ${drawer ? styles.drawer : ''} ${className}`}
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      {children}
    </div>,
    document.body,
  )
}
