import { createContext } from 'react'

// Estado (lista de toasts ativos) — só o ToastContainer consome isso.
export const ToastStateContext = createContext(undefined)
