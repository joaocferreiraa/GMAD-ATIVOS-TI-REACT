import { supabase } from './client'

// Estado global do indicador de sincronização — equivalente ao syncState/
// setSyncState() do sistema original: kvGet/kvSet marcam 'syncing' antes da
// chamada e 'connected'/'offline' depois, e guardam o horário da última
// sincronização bem-sucedida. Fica fora do React (módulo simples com
// subscribe/notify) porque kvStore.js não é um componente; useSyncStatus.js
// expõe isso para a UI via useSyncExternalStore.
// lastError guarda a RAZÃO da última falha, não só o fato de ter falhado.
// Sem ela, "offline" cobria tanto cabo desconectado quanto erro de permissão
// no banco — dois problemas com soluções opostas, indistinguíveis na tela.
// Quem exibe cruza isso com navigator.onLine (ver useOnlineStatus) pra separar
// "o aparelho caiu" de "o banco recusou".
let state = {
  status: supabase ? 'connected' : 'offline',
  lastSync: null,
  lastError: null,
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

// Limpa lastError junto: um sucesso torna a falha anterior história, e deixá-la
// no estado faria a tela mostrar erro antigo ao lado de "sincronizado agora".
export function markConnected() {
  setState({ status: 'connected', lastSync: new Date(), lastError: null })
}

export function markOffline(error) {
  setState({ status: 'offline', lastError: error?.message || null })
}
