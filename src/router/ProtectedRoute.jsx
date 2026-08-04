import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/auth/useAuth'
import { ROUTES } from '../constants/routes'

// Bloqueia acesso às rotas da aplicação enquanto não houver sessão autenticada.
export default function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return null

  if (!isAuthenticated) return <Navigate to={ROUTES.login} replace />

  return <Outlet />
}
