import { useLayoutEffect, useRef, useState } from 'react'
import { useClickOutside } from '../../../hooks/overlay/useClickOutside'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import { ChevronDownIcon } from '../Icon/icons'
import styles from './Dropdown.module.css'

// Menu suspenso genérico (equivalente ao .unit-select do sistema original —
// gatilho em formato de pílula + lista de opções). Diferente do Select: não
// representa um campo de formulário, e sim um menu de ações/filtro rápido.
export default function Dropdown({ label, items, activeValue, onSelect }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const rootRef = useRef(null)
  const menuRef = useRef(null)

  function close() {
    setOpen(false)
    setDropUp(false)
  }

  useClickOutside(rootRef, open, close)
  useEscapeKey(open, close)

  // .menu não tem max-height/scroll próprio — sem essa checagem, um menu com
  // muitos itens aberto perto do rodapé da tela (comum em toolbars de
  // filtro no iPhone) simplesmente é cortado pela borda da viewport.
  useLayoutEffect(() => {
    if (!open) return
    const trigger = rootRef.current
    const menu = menuRef.current
    if (!trigger || !menu) return
    const triggerRect = trigger.getBoundingClientRect()
    const spaceBelow = window.innerHeight - triggerRect.bottom
    const spaceAbove = triggerRect.top
    setDropUp(spaceBelow < menu.offsetHeight && spaceAbove > spaceBelow)
  }, [open])

  return (
    <div ref={rootRef} className={`${styles.dropdown} ${open ? styles.open : ''}`}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{label}</span>
        <ChevronDownIcon />
      </button>

      {open && (
        <div
          ref={menuRef}
          className={`${styles.menu} ${dropUp ? styles.menuUp : ''}`}
          role="menu"
        >
          {items.map((item) => (
            <div
              key={item.value}
              role="menuitem"
              className={`${styles.item} ${item.value === activeValue ? styles.active : ''}`}
              onClick={() => {
                onSelect(item.value)
                close()
              }}
            >
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
