import { supabase } from '../supabase/client'

const TABELA = 'historico_alteracoes'

// Quantas entradas a tela "Atividade recente" carrega. Antes o teto era 40 e
// era DESTRUTIVO — a 41ª ação apagava a primeira para sempre. Agora é só o
// tamanho da página: o banco guarda tudo (ver 0013_historico_alteracoes.sql),
// isto é apenas o quanto se lê de uma vez.
//
// Sem parâmetro de propósito: getLogEntries é passada direto como queryFn
// (ver createQueryHook), e o React Query chama a queryFn com um objeto de
// contexto no primeiro argumento — um `limite` posicional receberia esse
// objeto em vez de um número.
const LIMITE_LEITURA = 200

// Campos que nunca entram no histórico. O motivo não é quem pode ler (a
// tabela tem a mesma audiência dos dados de origem: qualquer pessoa logada),
// e sim a PERMANÊNCIA: o histórico é só-acréscimo e o app não consegue apagar
// linha de lá, então uma senha gravada aqui continuaria legível muito depois
// de ter sido trocada. Redigir na gravação é a única chance — depois não há
// como voltar atrás pela interface.
//
// Feito aqui, e não em cada chamador, para valer também para o módulo que
// alguém acrescentar amanhã sem lembrar desta conversa.
const CAMPOS_SENSIVEIS = /senha|password|secret|token|apikey|api_key|credencial/i

function redigir(dados) {
  if (!dados || typeof dados !== 'object' || Array.isArray(dados)) return dados
  const limpo = {}
  for (const [chave, valor] of Object.entries(dados)) {
    limpo[chave] = CAMPOS_SENSIVEIS.test(chave) ? '[omitido]' : valor
  }
  return limpo
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    )
  }
  return supabase
}

// Registra uma ação no histórico permanente.
//
// `contexto` é opcional e carrega o que transforma um feed em auditoria:
//   acao        'criar' | 'editar' | 'excluir'
//   entidade    módulo em que aconteceu ('ativos', 'contatos'...)
//   entidadeUid uid do registro afetado — é por ele que se monta a linha do
//               tempo de um ativo específico
//   rotulo      identificador legível no momento da ação (hostname, nome)
//   dados       o registro inteiro; em 'excluir', o que existia antes de
//               sumir. É a parte que permite recadastrar à mão sem backup.
//
// Chamadas antigas que passam só (texto, autor) continuam válidas e caem nos
// padrões abaixo — o histórico fica menos rico para elas, nunca quebrado.
//
// A versão anterior disto vivia no kv_store e precisava de compare-and-swap
// com três tentativas: gravar uma entrada significava reescrever a lista
// inteira, e duas ações simultâneas se sobrescreviam. Um INSERT em tabela
// só-acréscimo não tem essa corrida — cada ação é uma linha, e duas linhas
// não competem. Por isso não há retry aqui.
// Não mexe no indicador de sincronização, embora a versão do kv_store
// mexesse: lá isso vinha de brinde por passar pelo kvGet/kvSet. Aqui seria
// um sinal falso — o histórico é escrita auxiliar, e uma falha só dele
// acenderia "sem conexão" mesmo com a gravação principal bem-sucedida. Quem
// dita o indicador é o caminho dos dados de verdade (getFreshFn/saveFn em
// createCrudMutations), que roda em toda mutação de qualquer jeito.
export async function pushLog(texto, autor, contexto = {}) {
  const { acao = 'editar', entidade = 'geral', entidadeUid, rotulo, dados } = contexto
  try {
    const { error } = await requireSupabase()
      .from(TABELA)
      .insert({
        autor: autor || 'Alguém da equipe',
        acao,
        entidade,
        entidade_uid: entidadeUid,
        rotulo,
        texto,
        dados: redigir(dados),
      })
    if (error) throw error
  } catch {
    // Mesma postura de antes: registrar o que aconteceu não pode derrubar a
    // operação que aconteceu. Quem chamou não precisa saber que o histórico
    // falhou — a gravação principal segue e é ela que decide o toast.
  }
}

// Leitura da tela "Atividade recente" e do relatório de mesmo nome.
//
// Devolve no formato { ts, texto, por } que os dois já consumiam quando isto
// morava no kv_store — a troca de armazenamento não atravessa a fronteira do
// serviço. Falha vira lista vazia em vez de erro: numa base recém-migrada,
// propagar erro mostraria "Verifique sua conexão" para uma tabela que apenas
// ainda não tem linhas.
export async function getLogEntries() {
  try {
    const { data, error } = await requireSupabase()
      .from(TABELA)
      .select('criado_em, texto, autor')
      .order('criado_em', { ascending: false })
      .limit(LIMITE_LEITURA)
    if (error) throw error
    return (data || []).map((linha) => ({
      ts: linha.criado_em,
      texto: linha.texto,
      por: linha.autor,
    }))
  } catch {
    return []
  }
}
