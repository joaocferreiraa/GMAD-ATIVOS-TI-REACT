import { useRef, useState } from 'react'
import { useClickOutside } from '../../../hooks/overlay/useClickOutside'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import styles from './KpiStrip.module.css'

const TONE_CLASS = { green: 'iconGreen', orange: 'iconOrange', blue: 'iconBlue', yellow: 'iconYellow' }

// Passar o mouse (ou focar via teclado) revela um detalhe que não aparece em
// nenhum outro card do painel: valor investido/saúde por categoria, maior e
// menor unidade, top categorias por valor — ver useDashboardData.js. O
// popover só existe no DOM quando ativo (hover ou clique fixando, pra tiles
// sem `to`), em vez de sempre presente com opacity/visibility — evita
// qualquer problema de CSS/empilhamento silencioso.
//
// Tiles com `to` (total + cada categoria — ver useDashboardData.js) levam
// pra Ativos cadastrados já filtrado: clicar navega em vez de fixar o
// popover, mas o hover continua mostrando o detalhe antes de clicar.
function Tile({ icon: Icon, tone, value, label, detail = [], to, onNavigate }) {
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const rootRef = useRef(null)
  const show = pinned || hovered

  function close() {
    setPinned(false)
  }

  useClickOutside(rootRef, pinned, close)
  useEscapeKey(pinned, close)

  function handleClick() {
    if (to) onNavigate(to)
    else setPinned((p) => !p)
  }

  // Enter/Space aciona o clique — um <div role="button"> não faz isso
  // sozinho como um <button> nativo faria, então sem isso um tile só é
  // alcançável com o mouse.
  function handleKeyDown(event) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleClick()
    }
  }

  return (
    <div
      ref={rootRef}
      className={`${styles.tile} ${show ? styles.active : ''}`}
      tabIndex={0}
      role="button"
      aria-expanded={to ? undefined : show}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
    >
      <div className={`${styles.icon} ${styles[TONE_CLASS[tone]]}`}>
        <Icon />
      </div>
      <div className={styles.value}>{value}</div>
      <div className={styles.label}>{label}</div>
      {show && (
        <div className={styles.detail} role="tooltip">
          {detail.map((row) => (
            <div key={row.label} className={styles.detailRow}>
              <span>{row.label}</span>
              <b>{row.value}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Faixa de KPIs do Dashboard (.kpis do sistema original): grupo de inventário
// (total + por categoria + unidades) e grupo financeiro (valor investido).
export default function KpiStrip({ inventoryTiles, financeTiles, onNavigate }) {
  return (
    <div className={styles.kpis}>
      {inventoryTiles.map((tile) => (
        <Tile key={tile.label} {...tile} onNavigate={onNavigate} />
      ))}
      {financeTiles.map((tile) => (
        <Tile key={tile.label} {...tile} onNavigate={onNavigate} />
      ))}
    </div>
  )
}
