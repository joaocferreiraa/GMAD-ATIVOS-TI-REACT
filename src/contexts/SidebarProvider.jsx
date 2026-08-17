import { useCallback, useMemo, useState } from 'react'
import { SidebarContext } from './SidebarContext'

const MODE_KEY = 'gmad_sidebar_mode'
const LEGACY_COLLAPSED_KEY = 'gmad_sidebar_collapsed'
const MODES = ['expanded', 'collapsed', 'hover']

function computeDefaultMode() {
  return window.innerWidth < 1600 ? 'collapsed' : 'expanded'
}

function readInitialMode() {
  const stored = localStorage.getItem(MODE_KEY)
  if (MODES.includes(stored)) return stored
  // Migra a preferência antiga (só expandido/recolhido) na primeira leitura
  // depois que este controle ganhou o modo "expandir ao passar o mouse".
  const legacy = localStorage.getItem(LEGACY_COLLAPSED_KEY)
  if (legacy !== null) return legacy === '1' ? 'collapsed' : 'expanded'
  return computeDefaultMode()
}

export function SidebarProvider({ children }) {
  const [mode, setModeState] = useState(readInitialMode)
  const [hovering, setHovering] = useState(false)

  const setMode = useCallback((next) => {
    setModeState(next)
    try {
      localStorage.setItem(MODE_KEY, next)
    } catch {
      // localStorage indisponível — preferência não persiste, mas segue funcionando na sessão.
    }
  }, [])

  // "hover" reserva o mesmo espaço de layout do recolhido — o conteúdo não
  // pula quando a barra se abre por cima ao passar o mouse (ver `peek` e
  // .sidebar.peek em Sidebar.module.css, que estoura a largura reservada
  // sem mexer em --sidebar-w).
  const collapsed = mode !== 'expanded'
  const peek = mode === 'hover' && hovering

  const value = useMemo(
    () => ({ mode, setMode, collapsed, peek, hovering, setHovering }),
    [mode, setMode, collapsed, peek, hovering],
  )

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
}
