import { useCallback, useMemo, useRef, useState } from 'react'
import { ToastActionsContext } from './ToastActionsContext'
import { ToastStateContext } from './ToastStateContext'

const TOAST_DURATION = 3400 // ms — mesmo tempo do toast() original

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const idRef = useRef(0)

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id))
  }, [])

  const showToast = useCallback(
    (message, variant = 'default') => {
      const id = ++idRef.current
      setToasts((current) => [...current, { id, message, variant }])
      setTimeout(() => dismissToast(id), TOAST_DURATION)
    },
    [dismissToast],
  )

  const actions = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast])
  const state = useMemo(() => ({ toasts }), [toasts])

  return (
    <ToastActionsContext.Provider value={actions}>
      <ToastStateContext.Provider value={state}>{children}</ToastStateContext.Provider>
    </ToastActionsContext.Provider>
  )
}
