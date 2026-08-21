import { beforeEach, describe, expect, it, vi } from 'vitest'

// Mesmo ponto de costura do kvStore.test.js: o client é dublado no módulo, e
// `tabela` é trocada por teste. `tabela = null` simula projeto sem .env.local.
const estado = vi.hoisted(() => ({ tabela: null }))
vi.mock('../supabase/client', () => ({
  get supabase() {
    return estado.tabela === null ? null : { from: (nome) => estado.tabela(nome) }
  },
}))

const { pushLog, getLogEntries } = await import('./activityLogService')

// Encadeamento do PostgREST. `registro` recebe as chamadas feitas, para o
// teste afirmar sobre colunas, ordenação e limite sem imitar o SDK inteiro.
function query(resultado, registro) {
  const chamadas = []
  const alvo = { then: (ok) => Promise.resolve(resultado).then(ok) }
  for (const metodo of ['insert', 'select', 'order', 'limit']) {
    alvo[metodo] = (...args) => {
      chamadas.push([metodo, ...args])
      return alvo
    }
  }
  if (registro) {
    registro.chamadas = chamadas
    registro.linha = () => chamadas.find(([m]) => m === 'insert')?.[1]
  }
  return alvo
}

beforeEach(() => {
  estado.tabela = null
})

describe('pushLog', () => {
  it('grava uma linha na tabela de histórico', async () => {
    const registro = {}
    let tabelaUsada
    estado.tabela = (nome) => {
      tabelaUsada = nome
      return query({ error: null }, registro)
    }

    await pushLog('Cadastrou o ativo NB-014', 'João Ferreira', {
      acao: 'criar',
      entidade: 'ativos',
      entidadeUid: 'uid-1',
      rotulo: 'NB-014',
      dados: { uid: 'uid-1', id: 'NB-014' },
    })

    expect(tabelaUsada).toBe('historico_alteracoes')
    expect(registro.linha()).toEqual({
      autor: 'João Ferreira',
      acao: 'criar',
      entidade: 'ativos',
      entidade_uid: 'uid-1',
      rotulo: 'NB-014',
      texto: 'Cadastrou o ativo NB-014',
      dados: { uid: 'uid-1', id: 'NB-014' },
    })
  })

  it('numa exclusão, guarda o registro inteiro — é o que permite refazer à mão', async () => {
    const registro = {}
    estado.tabela = () => query({ error: null }, registro)
    const ativo = { uid: 'uid-9', id: 'NB-007', usuario: 'Maria', preco: 4200 }

    await pushLog('Excluiu o ativo NB-007', 'João Ferreira', {
      acao: 'excluir',
      entidade: 'ativos',
      entidadeUid: ativo.uid,
      dados: ativo,
    })

    expect(registro.linha().dados).toEqual(ativo)
    expect(registro.linha().acao).toBe('excluir')
  })

  it('omite campos sensíveis do snapshot', async () => {
    // O histórico é só-acréscimo: o app não apaga linha de lá. Uma senha
    // gravada aqui ficaria legível para sempre, inclusive depois de trocada —
    // redigir na gravação é a única chance.
    const registro = {}
    estado.tabela = () => query({ error: null }, registro)

    await pushLog('Atualizou a rede', 'João Ferreira', {
      acao: 'editar',
      entidade: 'infraestrutura',
      dados: { ssid: 'GMAD-Corp', senha: 'segredo123', apiToken: 'abc', gateway: '10.0.0.1' },
    })

    expect(registro.linha().dados).toEqual({
      ssid: 'GMAD-Corp',
      senha: '[omitido]',
      apiToken: '[omitido]',
      gateway: '10.0.0.1',
    })
  })

  it('a redação não estraga um snapshot sem campo sensível', async () => {
    const registro = {}
    estado.tabela = () => query({ error: null }, registro)
    const ativo = { uid: 'u1', id: 'NB-014', preco: 4200, ativo: true, obs: null }

    await pushLog('Editou', 'João Ferreira', { acao: 'editar', entidade: 'ativos', dados: ativo })

    expect(registro.linha().dados).toEqual(ativo)
  })

  it('chamada antiga, só com texto e autor, continua válida', async () => {
    // useInfraMutations ainda chama assim. Deve registrar, não quebrar.
    const registro = {}
    estado.tabela = () => query({ error: null }, registro)

    await pushLog('Atualizou o Wi-Fi de Curitiba', 'João Ferreira')

    expect(registro.linha()).toMatchObject({
      acao: 'editar',
      entidade: 'geral',
      texto: 'Atualizou o Wi-Fi de Curitiba',
    })
  })

  it('sem autor, atribui a autoria genérica em vez de gravar vazio', async () => {
    const registro = {}
    estado.tabela = () => query({ error: null }, registro)

    await pushLog('Alguma ação', undefined)

    expect(registro.linha().autor).toBe('Alguém da equipe')
  })

  it('falha ao gravar não lança — o histórico não derruba a operação principal', async () => {
    estado.tabela = () => query({ error: new Error('sem rede') })

    await expect(pushLog('Ação qualquer', 'João Ferreira')).resolves.toBeUndefined()
  })

  it('falha no histórico não acende "sem conexão"', async () => {
    // O histórico é escrita auxiliar. Deixá-lo mexer no indicador global faria
    // uma falha só dele parecer queda de conexão, mesmo com a gravação
    // principal bem-sucedida — quem dita o indicador é o caminho dos dados.
    const { getSyncStatusSnapshot } = await import('../supabase/syncStatus')
    const antes = getSyncStatusSnapshot().status
    estado.tabela = () => query({ error: new Error('tabela não existe') })

    await pushLog('Ação qualquer', 'João Ferreira')

    expect(getSyncStatusSnapshot().status).toBe(antes)
  })

  it('sem Supabase configurado, também não lança', async () => {
    estado.tabela = null

    await expect(pushLog('Ação qualquer', 'João Ferreira')).resolves.toBeUndefined()
  })

  it('não tenta de novo: INSERT em tabela só-acréscimo não tem corrida', async () => {
    // O retry existia porque gravar no kv_store reescrevia a lista inteira e
    // duas ações simultâneas se sobrescreviam. Uma linha por ação não compete
    // com outra — repetir aqui só duplicaria a entrada.
    let tentativas = 0
    estado.tabela = () => {
      tentativas += 1
      return query({ error: new Error('falhou') })
    }

    await pushLog('Ação', 'João Ferreira')

    expect(tentativas).toBe(1)
  })
})

describe('getLogEntries', () => {
  it('devolve o formato { ts, texto, por } que a tela já consumia', async () => {
    // A troca de kv_store para tabela não pode atravessar a fronteira do
    // serviço: ActivityList e o relatório de Atividade leem estes três nomes.
    estado.tabela = () =>
      query({
        data: [{ criado_em: '2026-08-21T12:00:00Z', texto: 'Fez algo', autor: 'João Ferreira' }],
        error: null,
      })

    await expect(getLogEntries()).resolves.toEqual([
      { ts: '2026-08-21T12:00:00Z', texto: 'Fez algo', por: 'João Ferreira' },
    ])
  })

  it('pede as mais novas primeiro, com teto de leitura', async () => {
    const registro = {}
    estado.tabela = () => query({ data: [], error: null }, registro)

    await getLogEntries()

    expect(registro.chamadas).toContainEqual(['order', 'criado_em', { ascending: false }])
    expect(registro.chamadas).toContainEqual(['limit', 200])
  })

  it('ignora o argumento que o React Query passa para a queryFn', async () => {
    // getLogEntries é passada direto como queryFn (ver createQueryHook), e o
    // React Query a chama com um objeto de contexto. Um parâmetro posicional
    // aqui receberia esse objeto e iria parar dentro do .limit().
    const registro = {}
    estado.tabela = () => query({ data: [], error: null }, registro)

    await getLogEntries({ queryKey: ['atividade'], signal: new AbortController().signal })

    expect(registro.chamadas).toContainEqual(['limit', 200])
  })

  it('devolve lista vazia quando a consulta falha', async () => {
    // Propagar erro mostraria "Verifique sua conexão" numa base recém-migrada
    // que só ainda não tem linhas.
    estado.tabela = () => query({ data: null, error: new Error('falhou') })

    await expect(getLogEntries()).resolves.toEqual([])
  })

  it('devolve lista vazia sem Supabase configurado', async () => {
    estado.tabela = null

    await expect(getLogEntries()).resolves.toEqual([])
  })
})
