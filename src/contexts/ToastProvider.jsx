import { useCallback, useMemo, useRef, useState } from 'react'
import { ToastContext } from './ToastContext'

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

  const value = useMemo(
    () => ({ toasts, showToast, dismissToast }),
    [toasts, showToast, dismissToast],
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
