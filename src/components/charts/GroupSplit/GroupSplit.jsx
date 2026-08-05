import styles from './GroupSplit.module.css'

// Divisão Madville / Curitiba acima do gráfico de unidades (.group-split).
export default function GroupSplit({ madville, outras }) {
  return (
    <div className={styles.split}>
      <div className={`${styles.item} ${styles.madville}`}>
        <div className={styles.value}>{madville.value}</div>
        <div className={styles.label}>{madville.label}</div>
      </div>
      <div className={`${styles.item} ${styles.outras}`}>
        <div className={styles.value}>{outras.value}</div>
        <div className={styles.label}>{outras.label}</div>
      </div>
    </div>
  )
}
