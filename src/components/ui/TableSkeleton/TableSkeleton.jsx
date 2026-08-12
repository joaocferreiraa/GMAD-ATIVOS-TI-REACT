import styles from './TableSkeleton.module.css'

// Placeholder "shimmer" no formato de uma Table, usado no lugar do spinner de
// página inteira enquanto os dados carregam — evita o salto de layout entre
// o estado de loading e a tabela real.
export default function TableSkeleton({ columns = 5, rows = 6 }) {
  return (
    <div className={styles.wrap}>
      <table className={styles.table}>
        <tbody>
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c}>
                  <div className={styles.bar} style={{ '--i': r * columns + c }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
