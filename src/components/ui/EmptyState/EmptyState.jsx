import styles from './EmptyState.module.css'

// Estado vazio genérico (.empty-state do sistema original).
export default function EmptyState({ title, children }) {
  return (
    <div className={styles.emptyState}>
      {title && <b>{title}</b>}
      {children}
    </div>
  )
}
