import { createContext } from 'react'

// Ações (showToast/dismissToast) — separadas do estado (ver
// ToastStateContext) porque a grande maioria dos consumidores (praticamente
// todo hook de mutação) só dispara toasts e não precisa re-renderizar
// quando a pilha de toasts muda.
export const ToastActionsContext = createContext(undefined)
