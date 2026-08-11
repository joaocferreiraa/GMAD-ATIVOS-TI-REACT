import { useSyncExternalStore } from 'react'
import { getSyncStatusSnapshot, subscribeSyncStatus } from '../services/supabase/syncStatus'

// Estado do indicador de sincronização (Topbar) — 'connected' | 'syncing' |
// 'offline', atualizado a cada chamada real ao Supabase via kvGet/kvSet.
export function useSyncStatus() {
  return useSyncExternalStore(subscribeSyncStatus, getSyncStatusSnapshot, getSyncStatusSnapshot)
}
