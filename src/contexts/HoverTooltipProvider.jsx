import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { HoverTooltipContext } from './HoverTooltipContext'
import styles from './HoverTooltip.module.css'

// Tooltip único e compartilhado pro app inteiro — substitui o title="..."
// nativo do navegador (lento pra aparecer, sem estilo, "quadrado preto") nos
// botões só-com-ícone (ações de linha de tabela, fechar modal/drawer, etc).
// Um provider global em vez de cada botão portalizar o próprio tooltip: evita
// duplicar a lógica de posicionamento em dezenas de componentes e garante um
// único nó de tooltip no DOM por vez.
export function HoverTooltipProvider({ children }) {
  const [tooltip, setTooltip] = useState(null)

  // Qualquer clique ou tecla fecha o tooltip aberto. Sem isto ele fica preso
  // na tela para sempre quando a ação REMOVE do DOM o elemento que o abriu —
  // navegar para outra rota ("Máquinas detectadas"), fechar um modal, excluir
  // a linha da tabela: em nenhum desses casos o `mouseleave` chega, porque não
  // há mais elemento de onde o mouse possa sair. Na captura, para acontecer
  // antes de o React desmontar a árvore.
  useEffect(() => {
    const esconder = () => setTooltip(null)
    document.addEventListener('pointerdown', esconder, true)
    document.addEventListener('keydown', esconder, true)
    return () => {
      document.removeEventListener('pointerdown', esconder, true)
      document.removeEventListener('keydown', esconder, true)
    }
  }, [])

  const value = useMemo(
    () => ({
      showTooltip(event, label) {
        if (!label || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return
        const rect = event.currentTarget.getBoundingClientRect()
        // Abre pra direita por padrão, mas vira pra esquerda quando não há
        // espaço — botões na quina direita (ex: "Sair" na Topbar) senão
        // ficavam com o tooltip cortado pela borda da tela.
        const openLeft = window.innerWidth - rect.right < 180
        setTooltip({
          label,
          top: rect.top + rect.height / 2,
          left: openLeft ? rect.left - 8 : rect.right + 8,
          openLeft,
        })
      },
      hideTooltip() {
        setTooltip(null)
      },
    }),
    [],
  )

  return (
    <HoverTooltipContext.Provider value={value}>
      {children}
      {tooltip &&
        createPortal(
          <div
            className={`${styles.tooltip} ${tooltip.openLeft ? styles.openLeft : ''}`}
            role="tooltip"
            style={{ top: tooltip.top, left: tooltip.left }}
          >
            {tooltip.label}
          </div>,
          document.body,
        )}
    </HoverTooltipContext.Provider>
  )
}
