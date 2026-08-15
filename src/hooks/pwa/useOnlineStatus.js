import { useEffect, useState } from 'react'

// Conectividade real do navegador (evento online/offline) — usada só pro
// aviso de "sem internet" (ver OfflineBanner). Independente do indicador de
// sincronização da Topbar (useSyncStatus), que reflete o resultado das
// chamadas ao Supabase, não a conexão do dispositivo em si.
export function useOnlineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => {
    function handleOnline() {
      setOnline(true)
    }
    function handleOffline() {
      setOnline(false)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  return online
}
