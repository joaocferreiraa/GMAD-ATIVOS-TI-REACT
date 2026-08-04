import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { router } from './router/routes'

const queryClient = new QueryClient()

// Composição dos providers globais. AuthContext/ThemeContext/SidebarContext
// entram aqui quando forem implementados junto da migração das telas.
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
