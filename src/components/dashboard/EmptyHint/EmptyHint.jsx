import styles from './EmptyHint.module.css'

export default function EmptyHint({ children }) {
  return <div className={styles.hint}>{children}</div>
}
