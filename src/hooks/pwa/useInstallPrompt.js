import { useEffect, useState } from 'react'

const DISMISSED_KEY = 'gmad_pwa_install_dismissed'

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

// Controla o aviso "Instalar TI GMAD": só aparece quando o Chrome/Android
// sinaliza que a instalação é possível (beforeinstallprompt), some sozinho
// depois de instalado (appinstalled) e fica escondido se o usuário já
// dispensou uma vez (localStorage, mesmo padrão do resto do app).
export function useInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null)
  const [installed, setInstalled] = useState(isStandalone)
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault()
      setDeferredPrompt(event)
    }
    function handleAppInstalled() {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // localStorage indisponível — o aviso só volta a aparecer nesta sessão.
    }
  }

  async function promptInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    if (outcome !== 'accepted') dismiss()
  }

  return {
    canInstall: !!deferredPrompt && !installed && !dismissed,
    promptInstall,
    dismiss,
  }
}
