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
    // `padrao` cobre a chave ainda não existir (nenhuma foto no projeto) e
    // devolve updatedAt undefined, que faz o kvSet abaixo CRIAR a linha.
    //
    // Qualquer outro erro continua sendo lançado, e isso é essencial: ele pode
    // significar que a chave EXISTE, com fotos de outras pessoas, e só não
    // conseguimos ler agora — gravar por cima apagaria todas. É a mesma
    // distinção de antes, agora feita uma camada abaixo (ver kvStore).
    const atual = await kvGetWithMeta(FOTOS_KEY, { padrao: {} })

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
//
// Aqui havia um `catch { return {} }` aberto, que engolia TAMBÉM queda de rede
// e sessão expirada — o app mostrava todo mundo sem foto e nada indicava que
// só não tinha dado pra ler. Agora só a ausência da chave vira mapa vazio (via
// `padrao`); falha de verdade propaga, marca o indicador de sincronização e o
// React Query tenta de novo.
//
// Propagar é seguro pra quem consome: usePerfil lê `fotos?.[email] ?? null`,
// então erro vira foto nula e o avatar cai na silhueta, como já fazia.
export async function getFotosPerfil() {
  return (await kvGet(FOTOS_KEY, { padrao: {} })) || {}
}
