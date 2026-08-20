import { kvGet, kvGetWithMeta, kvSet, KvConflictError } from '../supabase/kvStore'

const FOTOS_KEY = 'gmad_perfil_fotos'
const MAX_RETRIES = 3

// Fotos de perfil, indexadas pelo e-mail do usuário.
//
// POR QUE NÃO EM user_metadata, onde moram setor e cargo: o user_metadata é
// embutido no JWT, e o JWT viaja no cabeçalho de TODA requisição ao Supabase.
// Uma imagem ali — mesmo pequena — engordaria cada chamada do app inteiro,
// pra sempre. Texto curto (setor, cargo) é barato e útil ter na sessão; foto
// não é nem uma coisa nem outra.
//
// POR QUE NÃO NO SUPABASE STORAGE, que seria o lugar canônico: o projeto não
// usa Storage em parte nenhuma. Ligar exigiria criar bucket e políticas de
// acesso no painel do Supabase — passo manual fora do código, que quebraria
// pra quem clonar o projeto sem saber. O kv_store já existe, já tem trava de
// concorrência e já é como todas as coleções do app são guardadas.
//
// A imagem chega aqui já reduzida e em data URL (ver utils/imagem.js): um
// avatar de 128px em JPEG dá uns 6-10KB, tamanho que uma coluna JSONB
// carrega sem drama.
export async function salvarFotoPerfil(email, dataUrl) {
  if (!email) throw new Error('Sem usuário para associar a foto.')

  let ultimoErro
  for (let tentativa = 0; tentativa < MAX_RETRIES; tentativa++) {
    let atual
    try {
      atual = await kvGetWithMeta(FOTOS_KEY)
    } catch (e) {
      // PGRST116 = chave ainda não existe (nenhuma foto no projeto). Qualquer
      // outro erro pode significar que existe com fotos de outras pessoas que
      // não conseguimos ler agora — gravar por cima apagaria todas.
      if (e?.code !== 'PGRST116') throw e
      atual = { value: {}, updatedAt: undefined }
    }

    // Mapa e não lista: cada pessoa tem no máximo uma foto, e a chave é o
    // e-mail. Remover é gravar null, não apagar a entrada — assim quem já
    // tinha foto e tirou não volta a herdar nada.
    const mapa = { ...(atual.value || {}), [email]: dataUrl }
    try {
      await kvSet(FOTOS_KEY, mapa, { expectedUpdatedAt: atual.updatedAt })
      return
    } catch (e) {
      ultimoErro = e
      // Duas pessoas trocando a foto ao mesmo tempo é o caso que a trava
      // existe pra cobrir: sem ela, a última gravação apagaria a foto da
      // outra junto, porque as duas escrevem o MESMO mapa.
      if (e instanceof KvConflictError) continue
      throw e
    }
  }
  throw ultimoErro ?? new Error('Não foi possível salvar a foto.')
}

// Mapa e-mail -> data URL. Chave inexistente vira mapa vazio: "ninguém pôs
// foto ainda" é estado normal, não falha.
export async function getFotosPerfil() {
  try {
    return (await kvGet(FOTOS_KEY)) || {}
  } catch {
    return {}
  }
}
