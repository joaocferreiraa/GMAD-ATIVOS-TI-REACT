import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  ASSET_STATUSES,
  slaStatus,
  SLA_COLORS,
} from '../../../config/itConfig'
import styles from './itBadges.module.css'

// A forma vem do CSS module (igual à do Badge da plataforma); a cor de cada
// status vem do itConfig, via custom properties.
function pillVars(cfg) {
  return { '--pill-fg': cfg.color, '--pill-bg': cfg.bg }
}

function Empty() {
  return <span className={styles.empty}>—</span>
}

export const PriorityBadge = ({ priority }) => {
  const cfg = TICKET_PRIORITIES[priority]
  if (!cfg) return <Empty />
  return (
    <span className={styles.pill} style={pillVars(cfg)} title={cfg.description}>
      <span className={styles.dot} />
      {cfg.label}
    </span>
  )
}

export const StatusBadge = ({ status }) => {
  const cfg = TICKET_STATUSES[status]
  if (!cfg) return <Empty />
  return (
    <span className={styles.pill} style={pillVars(cfg)}>
      {cfg.label}
    </span>
  )
}

export const AssetStatusBadge = ({ status }) => {
  const cfg = ASSET_STATUSES[status]
  if (!cfg) return <Empty />
  return (
    <span className={styles.pill} style={pillVars(cfg)}>
      {cfg.label}
    </span>
  )
}

// Por onde o chamado entrou. Fica discreto ao lado do título — o que importa
// na fila é o problema, não o canal.
const SOURCES = {
  whatsapp: { label: 'WhatsApp', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  painel: { label: 'Painel', color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
}

export const SourceBadge = ({ source }) => {
  const cfg = SOURCES[source]
  if (!cfg) return null
  return (
    <span className={`${styles.pill} ${styles.source}`} style={pillVars(cfg)}>
      {cfg.label}
    </span>
  )
}

export const SlaBadge = ({ ticket }) => {
  const { state, label } = slaStatus(ticket)
  return (
    <span className={styles.sla} style={{ color: SLA_COLORS[state] }}>
      {label}
    </span>
  )
}
