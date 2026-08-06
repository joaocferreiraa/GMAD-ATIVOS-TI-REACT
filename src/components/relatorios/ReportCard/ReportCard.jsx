import Card from '../../ui/Card/Card'
import Button from '../../ui/Button/Button'
import styles from './ReportCard.module.css'

// Card de um relatório na grade inicial da Central de Relatórios
// (.report-card do sistema original).
export default function ReportCard({ report, onOpen }) {
  const Icon = report.icon
  return (
    <Card className={styles.card}>
      <div className={styles.icon}>
        <Icon />
      </div>
      <h3>{report.title}</h3>
      <p className={styles.desc}>{report.desc}</p>
      <Button variant="primary" size="sm" onClick={() => onOpen(report.key)}>
        Gerar relatório
      </Button>
    </Card>
  )
}
