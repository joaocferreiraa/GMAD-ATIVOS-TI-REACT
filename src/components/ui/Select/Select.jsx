import { useId, useMemo, useRef, useState } from 'react'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { useEscapeKey } from '../../../hooks/useEscapeKey'
import { ChevronDownIcon, CheckIcon } from '../Icon/icons'
import styles from './Select.module.css'

// Select customizado e acessível (equivalente ao "gsel" do sistema original,
// reimplementado como componente React controlado — sem MutationObserver).
// `context="toolbar"` usa o dimensionamento compacto das barras de filtro;
// `context="form"` (padrão) usa o dimensionamento dos formulários.
export default function Select({
  id,
  value,
  onChange,
  options,
  placeholder = '—',
  context = 'form',
  disabled = false,
  'aria-label': ariaLabel,
}) {
  const [open, setOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const rootRef = useRef(null)
  const typeBufferRef = useRef('')
  const typeTimerRef = useRef(null)
  const generatedId = useId()
  const instanceId = id || generatedId

  const selectedIndex = useMemo(() => options.findIndex((o) => o.value === value), [options, value])
  const currentLabel = selectedIndex >= 0 ? options[selectedIndex].label : placeholder

  function close() {
    setOpen(false)
    setHighlightedIndex(-1)
  }

  useClickOutside(rootRef, open, close)
  useEscapeKey(open, close)

  function commit(index) {
    const option = options[index]
    if (!option) return
    onChange(option.value)
    close()
  }

  function openPanel() {
    if (disabled || !options.length) return
    setOpen(true)
    setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0)
  }

  function moveHighlight(delta) {
    setHighlightedIndex((current) => {
      const base = current < 0 ? selectedIndex : current
      const next = (base + delta + options.length) % options.length
      return next
    })
  }

  function typeAhead(char) {
    typeBufferRef.current += char.toLowerCase()
    clearTimeout(typeTimerRef.current)
    typeTimerRef.current = setTimeout(() => {
      typeBufferRef.current = ''
    }, 600)
    const index = options.findIndex((o) => o.label.toLowerCase().startsWith(typeBufferRef.current))
    if (index < 0) return
    if (open) setHighlightedIndex(index)
    else commit(index)
  }

  function handleTriggerKeyDown(event) {
    if (disabled) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) openPanel()
      else moveHighlight(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (!open) openPanel()
      else moveHighlight(-1)
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (!open) openPanel()
      else if (highlightedIndex >= 0) commit(highlightedIndex)
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      typeAhead(event.key)
    }
  }

  const panelId = `${instanceId}-panel`

  return (
    <span
      ref={rootRef}
      className={`${styles.select} ${context === 'toolbar' ? styles.toolbarCtx : styles.formCtx} ${open ? styles.open : ''}`}
    >
      <button
        type="button"
        id={instanceId}
        className={styles.trigger}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? close() : openPanel())}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className={styles.label}>{currentLabel}</span>
        <ChevronDownIcon className={styles.chevron} />
      </button>

      {open && (
        <div id={panelId} className={styles.panel} role="listbox">
          {options.length === 0 && <div className={styles.empty}>Nenhuma opção</div>}
          {options.map((option, index) => {
            const isSelected = index === selectedIndex
            const isHighlighted = index === highlightedIndex
            return (
              <div
                key={option.value}
                role="option"
                aria-selected={isSelected}
                className={`${styles.option} ${isSelected ? styles.selected : ''} ${isHighlighted ? styles.highlighted : ''}`}
                onMouseEnter={() => setHighlightedIndex(index)}
                onClick={() => commit(index)}
              >
                <span>{option.label}</span>
                <CheckIcon className={styles.check} />
              </div>
            )
          })}
        </div>
      )}
    </span>
  )
}
