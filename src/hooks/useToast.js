import { useContext } from 'react'
import { ToastActionsContext } from '../contexts/ToastActionsContext'

export function useToast() {
  const context = useContext(ToastActionsContext)
  if (context === undefined) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider.')
  }
  return context
}
