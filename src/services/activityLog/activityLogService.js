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

// Leitura do log de atividade — usada pela tela "Atividade recente" e pelo
// relatório de mesmo nome na Central de Relatórios. Mesma defesa do
// pushLog(): se a chave ainda não existir no kv_store, trata como log vazio
// em vez de propagar erro (evita um "Verifique sua conexão" enganoso numa
// situação que não tem nada a ver com rede).
export async function getLogEntries() {
  try {
    return (await kvGet(LOG_KEY)) || []
  } catch {
    return []
  }
}
