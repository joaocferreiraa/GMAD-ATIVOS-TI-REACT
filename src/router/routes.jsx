import { createBrowserRouter } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import AppLayout from '../layouts/AppLayout/AppLayout'
import AuthLayout from '../layouts/AuthLayout/AuthLayout'
import LoginPage from '../pages/LoginPage'
import DashboardPage from '../pages/DashboardPage'
import AtivosPage from '../pages/AtivosPage'
import EstoquePage from '../pages/EstoquePage'
import ContatosPage from '../pages/ContatosPage'
import InstaladoresPage from '../pages/InstaladoresPage'
import ScriptsPage from '../pages/ScriptsPage'
import InfraestruturaPage from '../pages/InfraestruturaPage'
import UnidadesPage from '../pages/UnidadesPage'
import AtividadePage from '../pages/AtividadePage'
import RelatoriosPage from '../pages/RelatoriosPage'
import NotFoundPage from '../pages/NotFoundPage'

// Rotas ainda não protegidas por autenticação (ProtectedRoute entra quando o
// Login/AuthContext forem migrados). Estrutura só para validar o roteamento base.
export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [{ path: ROUTES.login, element: <LoginPage /> }],
  },
  {
    element: <AppLayout />,
    children: [
      { path: ROUTES.dashboard, element: <DashboardPage /> },
      { path: ROUTES.ativos, element: <AtivosPage /> },
      { path: ROUTES.estoque, element: <EstoquePage /> },
      { path: ROUTES.contatos, element: <ContatosPage /> },
      { path: ROUTES.instaladores, element: <InstaladoresPage /> },
      { path: ROUTES.scripts, element: <ScriptsPage /> },
      { path: ROUTES.infraestrutura, element: <InfraestruturaPage /> },
      { path: ROUTES.unidades, element: <UnidadesPage /> },
      { path: ROUTES.atividade, element: <AtividadePage /> },
      { path: ROUTES.relatorios, element: <RelatoriosPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
