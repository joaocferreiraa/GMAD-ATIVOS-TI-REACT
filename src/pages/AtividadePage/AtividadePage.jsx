import { useAtividade } from '../../hooks/data/useAtividade'
import Card from '../../components/ui/Card/Card'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import ActivityList from '../../components/atividade/ActivityList/ActivityList'
import styles from './AtividadePage.module.css'

export default function AtividadePage() {
  const { data: logEntries, isLoading, isError } = useAtividade()

  return (
    <div>
      <div className={styles.heading}>
        <h2>Atividade recente</h2>
        <p>Histórico de cadastros, edições e exclusões feitas pela equipe.</p>
      </div>

      {isLoading && (
        <div className={styles.state}>
          <Loading label="Carregando atividade..." />
        </div>
      )}

      {isError && (
        <Alert variant="danger">
          Não foi possível carregar a atividade recente. Verifique sua conexão.
        </Alert>
      )}

      {!isLoading && !isError && (
        <Card>
          <ActivityList entries={logEntries ?? []} />
        </Card>
      )}
    </div>
  )
}
