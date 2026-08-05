import EmptyHint from '../EmptyHint/EmptyHint'
import styles from './DeptByUnit.module.css'

function DeptBar({ label, value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className={styles.row}>
      <span className={styles.dot} />
      <div className={styles.label}>{label}</div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.value}>{value}</div>
    </div>
  )
}

// Distribuição por setor em cada unidade (.dept-by-unit) — um bloco por
// unidade, sempre com todos os ativos (não respeita o filtro do dashboard,
// igual ao sistema original).
export default function DeptByUnit({ units }) {
  if (!units.length) return <EmptyHint>Nenhuma unidade cadastrada ainda.</EmptyHint>

  return (
    <div className={styles.grid}>
      {units.map((unit) => {
        const max = Math.max(1, ...unit.bars.map((b) => b.value))
        return (
          <div key={unit.unit} className={styles.block}>
            <div className={styles.title}>
              {unit.label} <span className={styles.count}>{unit.total}</span>
            </div>
            {unit.bars.length ? (
              unit.bars.map((bar) => (
                <DeptBar key={bar.label} label={bar.label} value={bar.value} max={max} />
              ))
            ) : (
              <EmptyHint>Sem ativos cadastrados.</EmptyHint>
            )}
          </div>
        )
      })}
    </div>
  )
}
