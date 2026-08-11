import { supabase } from './client'

// Estado global do indicador de sincronização — equivalente ao syncState/
// setSyncState() do sistema original: kvGet/kvSet marcam 'syncing' antes da
// chamada e 'connected'/'offline' depois, e guardam o horário da última
// sincronização bem-sucedida. Fica fora do React (módulo simples com
// subscribe/notify) porque kvStore.js não é um componente; useSyncStatus.js
// expõe isso para a UI via useSyncExternalStore.
let state = {
  status: supabase ? 'connected' : 'offline',
  lastSync: null,
}
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

export function subscribeSyncStatus(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getSyncStatusSnapshot() {
  return state
}

export function markSyncing() {
  setState({ status: 'syncing' })
}

export function markConnected() {
  setState({ status: 'connected', lastSync: new Date() })
}

export function markOffline() {
  setState({ status: 'offline' })
}
