import styles from './SummaryBar.module.css'

// Faixa de resumo discreta no topo de uma página — só números e rótulos,
// deliberadamente sem cards grandes/gradiente. Usada pelo Monitoramento de
// Rede (online/atenção/problemas) e pela Central de Chamados (fila por
// estado + alertas de SLA).
//
// `items`: [{ label, value, tone? }] — tone 'ok' | 'warn' | 'danger' colore
// só o número, para o alerta saltar sem poluir a faixa inteira.
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
