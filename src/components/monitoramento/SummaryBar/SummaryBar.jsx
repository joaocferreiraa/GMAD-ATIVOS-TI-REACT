import styles from './SummaryBar.module.css'

// Faixa de resumo discreta do Monitoramento de Rede — conexões monitoradas,
// online/atenção/problemas e última verificação. Deliberadamente sem cards
// grandes/gradiente: só números e rótulos, como o resto do painel.
export default function SummaryBar({ items }) {
  return (
    <div className={styles.bar}>
      {items.map((item) => (
        <div key={item.label} className={styles.stat}>
          <div className={`${styles.value} ${item.tone ? styles[item.tone] : ''}`}>
            {item.value}
          </div>
          <div className={styles.label}>{item.label}</div>
        </div>
      ))}
    </div>
  )
}
