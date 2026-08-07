import { useEffect } from 'react'

// Chama onOutside quando um clique acontece fora de `ref.current`, enquanto
// `active` for true. Usado por Select e Dropdown para fechar ao clicar fora.
export function useClickOutside(ref, active, onOutside) {
  useEffect(() => {
    if (!active) return undefined

    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onOutside()
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [ref, active, onOutside])
}
