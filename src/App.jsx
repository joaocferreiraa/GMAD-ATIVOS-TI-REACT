import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider'
import { ThemeProvider } from './contexts/ThemeProvider'
import { ToastProvider } from './contexts/ToastProvider'
import ToastContainer from './components/ui/Toast/ToastContainer'
import ErrorBoundary from './components/ErrorBoundary/ErrorBoundary'
import { router } from './router/routes'

// staleTime evita refetch a cada montagem de página dentro da mesma janela de
// 30s (ex: trocar de aba e voltar); retry reduzido de 3 (padrão) para 1 pra
// não insistir várias vezes antes de mostrar o Alert de erro já existente em
// cada página; refetchOnWindowFocus mantém o padrão do TanStack Query, mas
// agora como escolha explícita — os dados são compartilhados pela equipe via
// Supabase, então recarregar ao voltar o foco da janela é o comportamento
// desejado.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
})

export default function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <RouterProvider router={router} />
            </AuthProvider>
            <ToastContainer />
          </ToastProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
