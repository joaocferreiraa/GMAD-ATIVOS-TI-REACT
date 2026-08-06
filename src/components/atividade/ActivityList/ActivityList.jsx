import { fmtRelTime } from '../../../utils/formatters'
import styles from './ActivityList.module.css'

const MAX_VISIBLE = 15

// Lista de atividade recente (renderActivity() do sistema original) — só
// os 15 registros mais novos, sem filtros/paginação. O estado vazio usa a
// mesma linha estilizada como um item normal, igual ao original (não é o
// componente EmptyState genérico usado em outras telas).
export default function ActivityList({ entries }) {
  const visible = entries.slice(0, MAX_VISIBLE)

  if (!visible.length) {
    return (
      <div className={styles.list}>
        <div className={styles.item}>Nenhuma atividade registrada.</div>
      </div>
    )
  }

  return (
    <div className={styles.list}>
      {visible.map((e, i) => (
        <div key={i} className={styles.item}>
          <span className={styles.time}>{fmtRelTime(e.ts)}</span>
          <span>
            {e.texto} <b>— {e.por || ''}</b>
          </span>
        </div>
      ))}
    </div>
  )
}
