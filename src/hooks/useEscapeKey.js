import { useEffect } from 'react'

// Chama onEscape quando a tecla Esc é pressionada, enquanto `active` for true.
// Usado por Modal, Drawer, Select e Dropdown para fechar no teclado.
export function useEscapeKey(active, onEscape) {
  useEffect(() => {
    if (!active) return undefined

    function handleKeyDown(event) {
      if (event.key === 'Escape') onEscape()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [active, onEscape])
}
