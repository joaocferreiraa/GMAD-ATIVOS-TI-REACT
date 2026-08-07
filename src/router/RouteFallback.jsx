import Loading from '../components/ui/Loading/Loading'
import styles from './RouteFallback.module.css'

// Fallback do Suspense usado enquanto o chunk de uma rota lazy carrega —
// mesmo padrão visual (`Loading` + wrapper centralizado) já usado no estado
// de carregamento de cada página.
export default function RouteFallback() {
  return (
    <div className={styles.state}>
      <Loading label="Carregando..." />
    </div>
  )
}
