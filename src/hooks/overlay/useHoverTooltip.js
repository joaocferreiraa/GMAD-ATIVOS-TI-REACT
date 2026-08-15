import { useContext, useMemo } from 'react'
import { HoverTooltipContext } from '../../contexts/HoverTooltipContext'
import { isFocusTooltipSuppressed } from './focusTooltipSuppression'

// bindTooltip('Editar') devolve os handlers pra spread num elemento —
// substitui title="Editar" pelo tooltip compartilhado (ver
// HoverTooltipProvider). Só dispara com mouse de verdade (checado no
// provider), então não fica "preso" depois de um toque em touch.
export function useHoverTooltip() {
  const ctx = useContext(HoverTooltipContext)
  if (!ctx) throw new Error('useHoverTooltip precisa estar dentro de <HoverTooltipProvider>')
  const { showTooltip, hideTooltip } = ctx

  return useMemo(
    () =>
      function bindTooltip(label) {
        return {
          onMouseEnter: (event) => showTooltip(event, label),
          onMouseLeave: hideTooltip,
          // Ignora o foco disparado pelo Overlay (autofoco ao abrir, restaurar
          // foco ao fechar) — ver focusTooltipSuppression. Só mostra em foco
          // real do usuário (Tab).
          onFocus: (event) => {
            if (!isFocusTooltipSuppressed()) showTooltip(event, label)
          },
          onBlur: hideTooltip,
        }
      },
    [showTooltip, hideTooltip],
  )
}
