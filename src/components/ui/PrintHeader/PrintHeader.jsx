import styles from './PrintHeader.module.css'

// Cabeçalho exclusivo de impressão/PDF de um relatório (.report-print-header
// do sistema original) — invisível na tela, mostrado apenas em @media
// print via PrintHeader.module.css.
export default function PrintHeader({ empresa, titulo, filtros, dataStr, horaStr, qtd }) {
  return (
    <div className={styles.printHeader}>
      <div className={styles.company}>{empresa}</div>
      <div className={styles.title}>{titulo}</div>
      <div className={styles.meta}>
        <span>
          <b>Filtros:</b> {filtros}
        </span>
        <span>
          <b>Data:</b> {dataStr}
        </span>
        <span>
          <b>Hora:</b> {horaStr}
        </span>
        <span>
          <b>Registros:</b> {qtd}
        </span>
      </div>
    </div>
  )
}
