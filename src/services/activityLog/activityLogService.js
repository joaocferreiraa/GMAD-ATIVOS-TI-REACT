import { kvGet, kvGetWithMeta, kvSet, KvConflictError } from '../supabase/kvStore'

const LOG_KEY = 'gmad_ativos_log'
const MAX_ENTRIES = 40
const MAX_RETRIES = 3

// Registra uma entrada no log de atividade (mesmo padrão do pushLog()
// original): busca o log atual, insere no topo, mantém só as 40 mais
// recentes e grava de volta no kv_store — com trava otimista
// (compare-and-swap via `expectedUpdatedAt`, igual a todo outro escritor do
// kv_store, ver createCrudMutations.js) e algumas tentativas em caso de
// conflito. Duas ações quase simultâneas (duas pessoas editando coisas
// diferentes ao mesmo tempo, cada uma chamando pushLog) é uso normal, não
// exceção — sem CAS, a gravação que "ganha" apagava silenciosamente a
// entrada da outra, sem erro nenhum. Um conflito aqui só remonta a lista a
// partir do valor mais recente e tenta de nova vez, nunca precisa avisar o
// usuário (ninguém edita o log diretamente).
export async function pushLog(texto, autor) {
  const entry = { ts: new Date().toISOString(), texto, por: autor || 'Alguém da equipe' }
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    let current
    try {
      current = await kvGetWithMeta(LOG_KEY)
    } catch (e) {
      // PGRST116 = a linha gmad_ativos_log ainda não existe (ninguém
      // registrou nada ainda, ex: projeto Supabase novo) — trata como log
      // vazio e segue pra CRIAR a linha (expectedUpdatedAt undefined faz
      // kvSet gravar incondicional, ver kvStore.js). Qualquer OUTRO erro
      // (rede, sessão) é diferente: a linha pode existir de verdade com
      // histórico real que não conseguimos ler agora — assumir "vazia"
      // nesse caso apagaria tudo na gravação incondicional a seguir. Por
      // isso só esses dois casos são tratados de formas diferentes; pra
      // qualquer erro que não seja "linha não existe", desiste em silêncio
      // (mesma postura de "log não pode travar a operação principal").
      if (e?.code !== 'PGRST116') return
      current = { value: [], updatedAt: undefined }
    }
    const logEntries = [entry, ...(current.value || [])].slice(0, MAX_ENTRIES)
    try {
      await kvSet(LOG_KEY, logEntries, { expectedUpdatedAt: current.updatedAt })
      return
    } catch (e) {
      if (e instanceof KvConflictError) continue // outra gravação venceu nesse meio-tempo — tenta de novo com o valor mais recente
      return // outra falha (rede etc.) — não interrompe a operação principal
    }
  }
  // Esgotou as tentativas sob concorrência muito alta — desiste em silêncio,
  // mesma postura de "log não pode travar a operação principal".
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
