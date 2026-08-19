import BarChart from '../../charts/BarChart/BarChart'
import EmptyHint from '../EmptyHint/EmptyHint'
import styles from './DeptByUnit.module.css'

// Cores da marca, não a paleta --chart-* (constants/chartColors.js): este
// bloco só aparece na Visão geral, que ficou de propósito na identidade
// GMAD. Ver o comentário de DEPARTMENT_COLORS em DashboardPage.jsx.
const DEPT_COLORS = [
  'var(--verde-700)',
  'var(--laranja)',
  'var(--verde-600)',
  'var(--verde-800)',
  'var(--laranja-forte)',
  'var(--verde-900)',
  'var(--info)',
  'var(--yellow)',
  'var(--indigo)',
]

// Distribuição por setor em cada unidade (.dept-by-unit) — um bloco por
// unidade, sempre com todos os ativos (não respeita o filtro do dashboard,
// igual ao sistema original). Reaproveitado também pra "Colaboradores por
// departamento" (dados de Contatos em vez de Ativos) — daí os textos vazios
// configuráveis em vez de hardcoded.
export default function DeptByUnit({
  units,
  emptyMessage = 'Nenhuma unidade cadastrada ainda.',
  itemEmptyMessage = 'Sem ativos cadastrados.',
}) {
  if (!units.length) return <EmptyHint>{emptyMessage}</EmptyHint>

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
            <EmptyHint>{itemEmptyMessage}</EmptyHint>
          )}
        </div>
      ))}
    </div>
  )
}
