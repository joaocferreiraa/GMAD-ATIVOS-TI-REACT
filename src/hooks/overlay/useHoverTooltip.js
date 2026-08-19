import { useContext, useMemo } from 'react'
import { HoverTooltipContext } from '../../contexts/HoverTooltipContext'
import { isFocusTooltipSuppressed } from './focusTooltipSuppression'

// `matches()` LANÇA SyntaxError quando o navegador não conhece o seletor, e
// `:focus-visible` só existe no Safari a partir do 15.4 — num iPad velho o
// erro derrubaria o onFocus inteiro. Sem suporte, volta ao comportamento
// anterior (mostrar em qualquer foco), que é degradar, não quebrar.
function focoDeTeclado(element) {
  try {
    return element.matches(':focus-visible')
  } catch {
    return true
  }
}

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
            if (!focoDeTeclado(event.currentTarget)) return
            showTooltip(event, label)
          },
          onBlur: hideTooltip,
        }
      },
    [showTooltip, hideTooltip],
  )
}
