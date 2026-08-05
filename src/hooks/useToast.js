import { useContext } from 'react'
import { ToastContext } from '../contexts/ToastContext'

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider.')
  }
  return context
}
