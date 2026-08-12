import BarChart from '../../charts/BarChart/BarChart'
import EmptyHint from '../EmptyHint/EmptyHint'
import styles from './DeptByUnit.module.css'

const DEPT_COLORS = [
  'var(--verde-700)',
  'var(--laranja)',
  'var(--verde-600)',
  'var(--verde-800)',
  'var(--laranja-forte)',
  'var(--verde-900)',
]

// Distribuição por setor em cada unidade (.dept-by-unit) — um bloco por
// unidade, sempre com todos os ativos (não respeita o filtro do dashboard,
// igual ao sistema original).
export default function DeptByUnit({ units }) {
  if (!units.length) return <EmptyHint>Nenhuma unidade cadastrada ainda.</EmptyHint>

  return (
    <div className={styles.grid}>
      {units.map((unit) => (
        <div key={unit.unit} className={styles.block}>
          <div className={styles.title}>
            {unit.label} <span className={styles.count}>{unit.total}</span>
          </div>
          {unit.bars.length ? (
            <BarChart data={unit.bars} colors={DEPT_COLORS} compact showTotal={false} />
          ) : (
            <EmptyHint>Sem ativos cadastrados.</EmptyHint>
          )}
        </div>
      ))}
    </div>
  )
}
