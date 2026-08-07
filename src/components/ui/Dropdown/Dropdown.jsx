import { useRef, useState } from 'react'
import { useClickOutside } from '../../../hooks/overlay/useClickOutside'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import { ChevronDownIcon } from '../Icon/icons'
import styles from './Dropdown.module.css'

// Menu suspenso genérico (equivalente ao .unit-select do sistema original —
// gatilho em formato de pílula + lista de opções). Diferente do Select: não
// representa um campo de formulário, e sim um menu de ações/filtro rápido.
export default function Dropdown({ label, items, activeValue, onSelect }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  function close() {
    setOpen(false)
  }

  useClickOutside(rootRef, open, close)
  useEscapeKey(open, close)

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
        <div className={styles.menu} role="menu">
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
