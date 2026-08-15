// Overlay chama focusWithoutTooltip() nos focus() que ele mesmo dispara
// (autofoco ao abrir, restaurar foco ao fechar) — sem isso, o tooltip
// compartilhado (useHoverTooltip) apareceria como efeito colateral dessas
// trocas de foco programáticas, já que o navegador trata foco logo após
// qualquer tecla (ex.: Esc fechando o modal) como navegação por teclado.
let suppressed = false

export function focusWithoutTooltip(element) {
  if (!element) return
  suppressed = true
  element.focus()
  suppressed = false
}

export function isFocusTooltipSuppressed() {
  return suppressed
}
