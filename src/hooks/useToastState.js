import { useContext } from 'react'
import { ToastStateContext } from '../contexts/ToastStateContext'

// Só a pilha de toasts ativos — usado pelo ToastContainer, separado de
// useToast() (ações) pra não re-renderizar quem só dispara toasts.
export function useToastState() {
  const context = useContext(ToastStateContext)
  if (context === undefined) {
    throw new Error('useToastState deve ser usado dentro de um ToastProvider.')
  }
  return context
}
