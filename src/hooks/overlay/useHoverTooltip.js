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
          //
          // `:focus-visible` porque clicar num botão também o foca, e aí o
          // tooltip reaparecia logo depois de o próprio clique tê-lo fechado.
          // Quando a ação leva para outra rota, o botão some do DOM em
          // seguida, o `mouseleave`/`blur` nunca chega, e ele ficava preso na
          // tela nova. Só o foco de teclado deve abrir tooltip.
          onFocus: (event) => {
            if (isFocusTooltipSuppressed()) return
            if (!event.currentTarget.matches(':focus-visible')) return
            showTooltip(event, label)
          },
          onBlur: hideTooltip,
        }
      },
    [showTooltip, hideTooltip],
  )
}
