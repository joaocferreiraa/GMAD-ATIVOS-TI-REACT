import { useContext, useRef, useState } from 'react'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { useClickOutside } from '../../../hooks/overlay/useClickOutside'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { HoverTooltipContext } from '../../../contexts/HoverTooltipContext'
import { PanelIcon } from '../../../components/ui/Icon/icons'
import styles from './SidebarModeMenu.module.css'

const OPTIONS = [
  { value: 'expanded', label: 'Expandida' },
  { value: 'collapsed', label: 'Recolhida' },
  { value: 'hover', label: 'Expandir ao passar o mouse' },
]

// Controle da barra lateral, no rodapé (equivalente ao "Sidebar control" do
// Supabase): substitui o antigo botão liga/desliga que ficava solto na
// Topbar por um popover com as 3 formas de usar a barra.
export default function SidebarModeMenu() {
  const { mode, setMode } = useSidebarState()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const bindTooltip = useHoverTooltip()
  const { hideTooltip } = useContext(HoverTooltipContext)

  // Em touch (iOS/Android, tablets sem mouse/trackpad) não existe hover de
  // verdade — "Expandir ao passar o mouse" ficaria sempre recolhida, sem
  // como abrir (mesma checagem que o tooltip global já usa pra não aparecer
  // em toque — ver HoverTooltipProvider). Só computado uma vez: capacidade
  // de hover não muda durante a sessão.
  const [canHover] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  )
  const options = canHover ? OPTIONS : OPTIONS.filter((option) => option.value !== 'hover')

  function close() {
    setOpen(false)
  }

  useClickOutside(rootRef, open, close)
  useEscapeKey(open, close)

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        type="button"
        className={`${styles.trigger} ${open ? styles.triggerOpen : ''}`}
        aria-label="Barra lateral"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          // Fecha o tooltip antes de abrir o popover — o clique tira o
          // binding do tooltip deste botão (`!open` vira false), então sem
          // isso ele ficaria preso na tela igual ao bug dos ícones da barra
          // (ver Sidebar.jsx).
          hideTooltip()
          setOpen((current) => !current)
        }}
        {...(!open ? bindTooltip('Barra lateral') : {})}
      >
        <PanelIcon />
      </button>

      {open && (
        <div className={styles.panel} role="menu">
          <div className={styles.panelTitle}>Barra lateral</div>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              role="menuitemradio"
              aria-checked={mode === option.value}
              className={`${styles.option} ${mode === option.value ? styles.active : ''}`}
              onClick={() => {
                setMode(option.value)
                close()
              }}
            >
              <span className={styles.radio} />
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
