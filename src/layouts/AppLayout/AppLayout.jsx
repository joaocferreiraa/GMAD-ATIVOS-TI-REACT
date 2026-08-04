import { Outlet } from 'react-router-dom'

// Casca da aplicação autenticada (sidebar + topbar + conteúdo). Sidebar/Topbar
// serão preenchidos quando essas telas forem migradas — por ora só o Outlet.
export default function AppLayout() {
  return <Outlet />
}
