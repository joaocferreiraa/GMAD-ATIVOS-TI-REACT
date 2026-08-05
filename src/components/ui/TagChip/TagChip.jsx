import styles from './TagChip.module.css'

// Chip mono-espaçado usado para identificadores (ex.: código do ativo).
export default function TagChip({ className = '', children, ...props }) {
  return (
    <span className={`${styles.tagChip} ${className}`} {...props}>
      {children}
    </span>
  )
}
