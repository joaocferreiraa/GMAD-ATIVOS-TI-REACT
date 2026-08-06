import { kvGet, kvSet } from '../supabase/kvStore'

const LOG_KEY = 'gmad_ativos_log'
const MAX_ENTRIES = 40

// Registra uma entrada no log de atividade (mesmo padrão do pushLog()
// original): busca o log atual, insere no topo, mantém só as 40 mais
// recentes e grava de volta no kv_store.
export async function pushLog(texto, autor) {
  let logEntries
  try {
    logEntries = (await kvGet(LOG_KEY)) || []
  } catch {
    logEntries = []
  }
  logEntries = [
    { ts: new Date().toISOString(), texto, por: autor || 'Alguém da equipe' },
    ...logEntries,
  ].slice(0, MAX_ENTRIES)
  try {
    await kvSet(LOG_KEY, logEntries)
  } catch {
    // Falha ao gravar o log não deve interromper a operação principal (mesmo comportamento do pushLog original).
  }
}

// Leitura do log de atividade — usada pelo relatório "Atividade recente" da
// Central de Relatórios (a tela de Atividade recente em si ainda não foi
// migrada).
export async function getLogEntries() {
  return kvGet(LOG_KEY)
}
