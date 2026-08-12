import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Overlay from '../../../components/ui/Modal/Overlay'
import { useGlobalSearch } from '../../../hooks/useGlobalSearch'
import { SearchIcon } from '../../../components/ui/Icon/icons'
import styles from './CommandPalette.module.css'

// Paleta de busca (Ctrl/Cmd+K) — busca de verdade em Ativos e Contatos
// cadastrados (não uma lista de páginas, que já existe na sidebar).
// Navegação por teclado (setas + Enter) sobre os resultados; selecionar um
// item leva para a página correspondente já com a ficha daquele registro
// aberta (via location.state.openUid, lido em AtivosPage/ContatosPage).
export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef(null)

  const groups = useGlobalSearch(query)
  const flatList = useMemo(() => groups.flatMap((g) => g.items), [groups])
  const indexById = useMemo(() => {
    const map = new Map()
    flatList.forEach((item, i) => map.set(item.id, i))
    return map
  }, [flatList])

  // Reseta busca/seleção sempre que a paleta abre (comparação com o valor
  // anterior durante o render, em vez de useEffect+setState — evita o
  // cascading render que o React Compiler sinaliza como erro).
  const [wasOpen, setWasOpen] = useState(false)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setQuery('')
      setActiveIndex(0)
    }
  }

  const [prevQuery, setPrevQuery] = useState(query)
  if (query !== prevQuery) {
    setPrevQuery(query)
    setActiveIndex(0)
  }

  useEffect(() => {
    if (!open) return undefined
    const frame = requestAnimationFrame(() => inputRef.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  if (!open) return null

  function runItem(item) {
    if (!item) return
    navigate(item.route, { state: { openUid: item.uid } })
    onClose()
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, flatList.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      runItem(flatList[activeIndex])
    }
  }

  const trimmed = query.trim()

  return (
    <Overlay open={open} onClose={onClose} className={styles.paletteOverlay}>
      <div className={styles.palette}>
        <div className={styles.searchRow}>
          <SearchIcon width={16} height={16} />
          <input
            ref={inputRef}
            type="text"
            className={styles.input}
            placeholder="Buscar ativos ou contatos..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Buscar ativos ou contatos"
          />
          <kbd className={styles.esc}>Esc</kbd>
        </div>

        <div className={styles.results}>
          {!trimmed && (
            <p className={styles.empty}>Digite para buscar por ID, usuário, nome, setor...</p>
          )}
          {trimmed && flatList.length === 0 && (
            <p className={styles.empty}>Nada encontrado para &quot;{trimmed}&quot;.</p>
          )}
          {groups.map((group) => (
            <div key={group.label} className={styles.section}>
              <div className={styles.sectionLabel}>{group.label}</div>
              {group.items.map((item) => {
                const index = indexById.get(item.id)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.item} ${activeIndex === index ? styles.itemActive : ''}`}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => runItem(item)}
                  >
                    <div className={styles.itemMain}>
                      <b>{item.title}</b>
                      {item.subtitle && <span>{item.subtitle}</span>}
                    </div>
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </Overlay>
  )
}
