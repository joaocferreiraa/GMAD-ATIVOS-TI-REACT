import { Outlet } from 'react-router-dom'
import { SidebarProvider } from '../../contexts/SidebarProvider'
import { useSidebarState } from '../../hooks/layout/useSidebarState'
import Sidebar from './Sidebar/Sidebar'
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
        {/* A trilha de navegação ficava aqui, acima do conteúdo. Passou pra
            barra do topo (ver Topbar): aqui ela caía logo acima do <h1> de
            cada página, repetindo o mesmo rótulo duas vezes seguidas. */}
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
