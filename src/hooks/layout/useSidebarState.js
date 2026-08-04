import { useContext } from 'react'
import { SidebarContext } from '../../contexts/SidebarContext'

export function useSidebarState() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebarState deve ser usado dentro de um SidebarProvider.')
  }
  return context
}
