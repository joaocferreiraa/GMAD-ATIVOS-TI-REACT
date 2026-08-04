import { useCallback, useMemo, useState } from 'react'
import { SidebarContext } from './SidebarContext'

const SIDEBAR_KEY = 'gmad_sidebar_collapsed'

function computeDefaultCollapsed() {
  return window.innerWidth < 1600
}

function readInitialCollapsed() {
  const stored = localStorage.getItem(SIDEBAR_KEY)
  return stored !== null ? stored === '1' : computeDefaultCollapsed()
}

export function SidebarProvider({ children }) {
  const [collapsed, setCollapsed] = useState(readInitialCollapsed)

  const toggleSidebar = useCallback(() => {
    setCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? '1' : '0')
      } catch {
        // localStorage indisponível — preferência não persiste, mas segue funcionando na sessão.
      }
      return next
    })
  }, [])

  const value = useMemo(() => ({ collapsed, toggleSidebar }), [collapsed, toggleSidebar])

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}
