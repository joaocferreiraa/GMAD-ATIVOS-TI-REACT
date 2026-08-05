import styles from './MiniStats.module.css'

const TONE_CLASS = { warn: 'warn', danger: 'danger', leaf: '' }

// Linha de alertas discreta no card "Requer atenção" (.mini-stats).
export default function MiniStats({ items }) {
  return (
    <div className={styles.list}>
      {items.map((item) => (
        <div key={item.label} className={`${styles.stat} ${styles[TONE_CLASS[item.tone]] || ''}`}>
          <div className={styles.value}>{item.value}</div>
          <div className={styles.label}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}
