import { supabase } from './client'
import { markConnected, markOffline, markSyncing } from './syncStatus'

// Wrapper genérico sobre a tabela kv_store (chave/valor em JSON) — o mesmo
// padrão de persistência usado por todos os domínios do sistema original
// (gmad_ativos_data, gmad_estoque_data, etc.), reaproveitado aqui em vez de
// reimplementado por serviço. Cada chamada marca o indicador de
// sincronização como 'syncing' antes e 'connected'/'offline' depois, igual
// ao kvGet/kvSet do sistema original.

// PGRST116 = o .single() não encontrou a linha. O banco RESPONDEU: a ida e
// volta funcionou, a sessão vale, a permissão vale — só não há registro
// gravado sob aquela chave ainda. Isso NÃO é falha de sincronização, e tratar
// como se fosse acendia "Falha ao sincronizar" com o banco perfeitamente no ar.
//
// Foi o que aconteceu com gmad_perfil_fotos: ninguém tinha posto foto, a linha
// não existia, e getFotosPerfil() engolia o erro e devolvia {} corretamente —
// mas o markOffline já tinha rodado aqui embaixo, antes do serviço decidir. A
// tela não mostrava erro nenhum e o indicador dizia que a conexão caíra.
//
// Quem chamou continua recebendo o erro e decide o que ausência significa:
// lista vazia de módulo novo (perfilService, activityLogService) ou falha de
// carregamento (os demais serviços).
function linhaInexistente(e) {
  return e?.code === 'PGRST116'
}

// Sentinela pra distinguir "não passaram padrão" de "o padrão é undefined".
// Um `padrao === undefined` como marca de ausência tornaria impossível ter
// undefined como valor legítimo, e a diferença entre os dois casos é
// justamente lançar o erro ou devolver a lista vazia.
const SEM_PADRAO = Symbol('kv-sem-padrao')

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    )
  }
  return supabase
}

// `padrao`: o que devolver quando a linha ainda não existe — o estado vazio
// daquele módulo (`[]` para as coleções, `{ construshow: [], wifi: [] }` para
// infraestrutura). Sem ele, ausência continua lançando.
//
// Módulo sem nenhum registro é estado NORMAL de base nova, não erro. Sem esse
// padrão, um Supabase recém-criado deixa o painel inutilizável: toda tela diz
// "não foi possível carregar", e nada pode ser criado, porque a gravação lê a
// linha antes de gravar e morre no mesmo PGRST116.
export async function kvGet(key, { padrao = SEM_PADRAO } = {}) {
  markSyncing()
  try {
    const { data, error } = await requireSupabase()
      .from('kv_store')
      .select('value')
      .eq('key', key)
      .single()
    if (error) throw error
    markConnected()
    return data.value
  } catch (e) {
    // Ver linhaInexistente: chave ausente é resposta do banco, não queda.
    if (linhaInexistente(e)) {
      markConnected()
      if (padrao !== SEM_PADRAO) return padrao
    } else markOffline(e)
    throw e
  }
}

// Igual a kvGet, mas também devolve o `updated_at` da linha — usado pelas
// mutações pra ler o valor mais recente (não o do cache local, que pode
// estar desatualizado) e depois gravar de forma condicional via kvSet.
// `padrao`: mesmo papel do kvGet. Aqui ele devolve `updatedAt: undefined`
// junto, e isso é o que faz a PRIMEIRA gravação do módulo funcionar — o kvSet
// sem `expectedUpdatedAt` grava incondicionalmente e CRIA a linha, em vez de
// tentar um compare-and-swap contra uma versão que não existe.
export async function kvGetWithMeta(key, { padrao = SEM_PADRAO } = {}) {
  markSyncing()
  try {
    const { data, error } = await requireSupabase()
      .from('kv_store')
      .select('value, updated_at')
      .eq('key', key)
      .single()
    if (error) throw error
    markConnected()
    return { value: data.value, updatedAt: data.updated_at }
  } catch (e) {
    // Mesma distinção do kvGet. Aqui ela importa duas vezes: este é o caminho
    // que as mutações usam antes de gravar, e a PRIMEIRA gravação de um módulo
    // vazio passa por aqui (ver salvarFotoPerfil, que trata PGRST116 e segue
    // para o upsert incondicional).
    if (linhaInexistente(e)) {
      markConnected()
      if (padrao !== SEM_PADRAO) return { value: padrao, updatedAt: undefined }
    } else markOffline(e)
    throw e
  }
}

// Erro específico de conflito de escrita — ver kvSet(expectedUpdatedAt).
export class KvConflictError extends Error {
  constructor(key) {
    super(`Conflito ao gravar "${key}": outra sessão alterou os dados nesse meio-tempo.`)
    this.name = 'KvConflictError'
  }
}

// `expectedUpdatedAt`: quando informado, a gravação só acontece se o
// `updated_at` da linha ainda for esse (compare-and-swap) — se outra sessão
// já tiver gravado por cima, lança KvConflictError em vez de sobrescrever
// silenciosamente. Sem esse parâmetro, grava incondicionalmente (upsert),
// mesmo comportamento de antes.
export async function kvSet(key, value, { expectedUpdatedAt } = {}) {
  markSyncing()
  try {
    const sb = requireSupabase()
    const nextUpdatedAt = new Date().toISOString()
    if (expectedUpdatedAt !== undefined) {
      const { data, error } = await sb
        .from('kv_store')
        .update({ value, updated_at: nextUpdatedAt })
        .eq('key', key)
        .eq('updated_at', expectedUpdatedAt)
        .select('key')
      if (error) throw error
      if (!data || data.length === 0) {
        markConnected()
        throw new KvConflictError(key)
      }
    } else {
      const { error } = await sb.from('kv_store').upsert({ key, value, updated_at: nextUpdatedAt })
      if (error) throw error
    }
    markConnected()
  } catch (e) {
    if (!(e instanceof KvConflictError)) markOffline(e)
    throw e
  }
}
