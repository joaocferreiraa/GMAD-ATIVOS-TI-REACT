import { Outlet } from 'react-router-dom'
import { SidebarProvider } from '../../contexts/SidebarProvider'
import { useSidebarState } from '../../hooks/layout/useSidebarState'
import Sidebar from './Sidebar/Sidebar'
import Breadcrumb from './Breadcrumb/Breadcrumb'
import Topbar from './Topbar/Topbar'
import Footer from './Footer/Footer'
import styles from './AppLayout.module.css'

function AppShell() {
  const { collapsed } = useSidebarState()

  return (
    <div className={`${styles.shell} ${collapsed ? styles.sidebarCollapsed : ''}`}>
      <Topbar />
      <Sidebar />
      <div className={styles.content}>
        <Breadcrumb />
        <div className={styles.view}>
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  )
}

// Casca da aplicação autenticada: sidebar + topbar fixos, conteúdo da página
// (via Outlet) e a barra de rodapé, reproduzindo o #app/.app originais.
export default function AppLayout() {
  return (
    <SidebarProvider>
      <AppShell />
    </SidebarProvider>
  )
}
