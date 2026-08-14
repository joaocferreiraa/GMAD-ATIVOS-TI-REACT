import { lazy, Suspense } from 'react'
import { createBrowserRouter } from 'react-router-dom'
import { ROUTES } from '../constants/routes'
import AppLayout from '../layouts/AppLayout/AppLayout'
import AuthLayout from '../layouts/AuthLayout/AuthLayout'
import ProtectedRoute from './ProtectedRoute'
import LoginPage from '../pages/LoginPage'
import NotFoundPage from '../pages/NotFoundPage'
import RouteFallback from './RouteFallback'
import RouteErrorBoundary from './RouteErrorBoundary'

// Páginas atrás do login carregam sob demanda (React.lazy) em vez de entrar
// no bundle inicial — LoginPage/NotFoundPage continuam estáticas por serem
// as primeiras telas vistas por usuários não autenticados. Este arquivo é
// config de rotas, não um componente — as declarações lazy() abaixo não são
// exportadas, então não há nada a quebrar no Fast Refresh.
/* eslint-disable react-refresh/only-export-components */
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const AtivosPage = lazy(() => import('../pages/AtivosPage'))
const EstoquePage = lazy(() => import('../pages/EstoquePage'))
const ContatosPage = lazy(() => import('../pages/ContatosPage'))
const InstaladoresPage = lazy(() => import('../pages/InstaladoresPage'))
const ScriptsPage = lazy(() => import('../pages/ScriptsPage'))
const InfraestruturaPage = lazy(() => import('../pages/InfraestruturaPage'))
const MonitoramentoRedePage = lazy(() => import('../pages/MonitoramentoRedePage'))
const AtividadePage = lazy(() => import('../pages/AtividadePage'))
const RelatoriosPage = lazy(() => import('../pages/RelatoriosPage'))

function lazyPage(Component) {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Component />
    </Suspense>
  )
}

export const router = createBrowserRouter([
  {
    // errorElement na raiz: pega qualquer erro não tratado de qualquer rota
    // abaixo (nenhuma delas define o próprio errorElement), incluindo falha
    // de import() dinâmico das páginas lazy — ver RouteErrorBoundary.
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: ROUTES.login, element: <LoginPage /> }],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { path: ROUTES.dashboard, element: lazyPage(DashboardPage) },
              { path: ROUTES.ativos, element: lazyPage(AtivosPage) },
              { path: ROUTES.estoque, element: lazyPage(EstoquePage) },
              { path: ROUTES.contatos, element: lazyPage(ContatosPage) },
              { path: ROUTES.instaladores, element: lazyPage(InstaladoresPage) },
              { path: ROUTES.scripts, element: lazyPage(ScriptsPage) },
              { path: ROUTES.infraestrutura, element: lazyPage(InfraestruturaPage) },
              { path: ROUTES.monitoramento, element: lazyPage(MonitoramentoRedePage) },
              { path: ROUTES.atividade, element: lazyPage(AtividadePage) },
              { path: ROUTES.relatorios, element: lazyPage(RelatoriosPage) },
            ],
          },
        ],
      },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
])
