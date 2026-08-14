import { useEffect, useState } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/auth/useAuth'
import { ROUTES } from '../constants/routes'
import RouteFallback from './RouteFallback'
import Alert from '../components/ui/Alert/Alert'
import Button from '../components/ui/Button/Button'
import styles from '../components/ErrorBoundary/ErrorBoundary.module.css'

// Se a checagem de sessão nunca resolver (ex: iOS suspendeu a requisição em
// background e ela não retoma sozinha ao voltar o foco), sem isso a tela
// fica em branco pra sempre — `isLoading` nunca sai de `true` e o
// ProtectedRoute original retornava null indefinidamente.
const SESSION_CHECK_TIMEOUT_MS = 10_000

// Bloqueia acesso às rotas da aplicação enquanto não houver sessão autenticada.
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()
  const [timedOut, setTimedOut] = useState(false)

  useEffect(() => {
    if (!isLoading) return undefined
    const timer = setTimeout(() => setTimedOut(true), SESSION_CHECK_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [isLoading])

  if (isLoading && timedOut) {
    return (
      <div className={styles.wrap}>
        <div className={styles.box}>
          <h1 className={styles.title}>Não foi possível confirmar sua sessão</h1>
          <Alert variant="danger">
            A verificação de login está demorando mais que o esperado. Confira sua conexão e
            tente novamente.
          </Alert>
          <div className={styles.actions}>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Recarregar página
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (isLoading) return <RouteFallback />

  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />

  return <Outlet />
}
