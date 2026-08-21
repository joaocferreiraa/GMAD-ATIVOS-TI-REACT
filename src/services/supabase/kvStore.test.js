import { beforeEach, describe, expect, it, vi } from 'vitest'

// O client é dublado no nível do módulo: kvStore importa `supabase` dele e o
// usa direto. `tabela` é trocada a cada teste pelo dublê que aquele caso
// precisa — é o ponto de costura mais raso possível, sem ter que imitar o
// SDK inteiro.
let tabela = null
vi.mock('./client', () => ({
  get supabase() {
    return tabela === null ? null : { from: (nome) => tabela(nome) }
  },
}))

const { kvGet, kvGetWithMeta, kvSet, KvConflictError } = await import('./kvStore')
const { getSyncStatusSnapshot } = await import('./syncStatus')

// Encadeamento do PostgREST: .select().eq().single() e .update().eq().eq()
// .select(). Cada método devolve o próprio objeto até o `await` no fim, que
// resolve com `resultado` — é o thenable que fecha a cadeia.
function query(resultado, registro) {
  const chamadas = []
  const alvo = {
    then: (onFulfilled) => Promise.resolve(resultado).then(onFulfilled),
  }
  for (const metodo of ['select', 'eq', 'single', 'update', 'upsert', 'insert']) {
    alvo[metodo] = (...args) => {
      chamadas.push([metodo, ...args])
      return alvo
    }
  }
  if (registro) registro.chamadas = chamadas
  return alvo
}

beforeEach(() => {
  tabela = null
})

describe('kvGet', () => {
  it('devolve o valor da chave e marca a sincronização como conectada', async () => {
    tabela = () => query({ data: { value: { total: 3 } }, error: null })

    await expect(kvGet('gmad_ativos_data')).resolves.toEqual({ total: 3 })
    expect(getSyncStatusSnapshot().status).toBe('connected')
  })

  it('propaga o erro e marca offline, guardando a razão da falha', async () => {
    tabela = () => query({ data: null, error: new Error('sem rede') })

    await expect(kvGet('gmad_ativos_data')).rejects.toThrow('sem rede')
    const { status, lastError } = getSyncStatusSnapshot()
    expect(status).toBe('offline')
    // lastError existe pra separar "cabo caiu" de "banco recusou" — se voltar
    // a ser só um booleano de falha, as duas viram a mesma coisa na tela.
    expect(lastError).toBe('sem rede')
  })

  it('chave inexistente NÃO acende "falha ao sincronizar"', async () => {
    // PGRST116 = o .single() não achou a linha. O banco respondeu — a ida e
    // volta funcionou. Marcar offline aqui fazia o painel dizer que a conexão
    // caiu enquanto a tela carregava normalmente (foi o caso real do
    // gmad_perfil_fotos, com ninguém tendo posto foto ainda).
    tabela = () =>
      query({ data: null, error: Object.assign(new Error('Cannot coerce'), { code: 'PGRST116' }) })

    await expect(kvGet('gmad_perfil_fotos')).rejects.toThrow('Cannot coerce')
    expect(getSyncStatusSnapshot().status).toBe('connected')
  })

  it('mas o erro continua chegando a quem chamou', async () => {
    // O indicador não acusa, e o serviço é quem decide o que ausência
    // significa: lista vazia (perfil, atividade) ou falha de carregamento.
    tabela = () =>
      query({ data: null, error: Object.assign(new Error('Cannot coerce'), { code: 'PGRST116' }) })

    await expect(kvGet('gmad_perfil_fotos')).rejects.toMatchObject({ code: 'PGRST116' })
  })

  it('com `padrao`, chave inexistente devolve o vazio em vez de lançar', async () => {
    // Módulo sem nenhum registro é estado normal de base nova. Sem isto, um
    // Supabase recém-criado deixa toda tela em "não foi possível carregar".
    tabela = () =>
      query({ data: null, error: Object.assign(new Error('Cannot coerce'), { code: 'PGRST116' }) })

    await expect(kvGet('gmad_estoque_data', { padrao: [] })).resolves.toEqual([])
    expect(getSyncStatusSnapshot().status).toBe('connected')
  })

  it('`padrao` não engole erro de verdade', async () => {
    // A rede caindo continua sendo falha, mesmo com padrão definido — senão o
    // padrão transformaria indisponibilidade em "a lista está vazia" e a tela
    // mostraria zero registros como se fosse a verdade.
    tabela = () => query({ data: null, error: new Error('sem rede') })

    await expect(kvGet('gmad_estoque_data', { padrao: [] })).rejects.toThrow('sem rede')
    expect(getSyncStatusSnapshot().status).toBe('offline')
  })

  it('falha com instrução acionável quando o Supabase não está configurado', async () => {
    tabela = null // supabase === null, como num checkout sem .env.local

    await expect(kvGet('gmad_ativos_data')).rejects.toThrow(/VITE_SUPABASE_URL/)
  })
})

describe('kvGetWithMeta', () => {
  it('chave inexistente também não acende falha aqui', async () => {
    // Este é o caminho que as mutações usam antes de gravar: a PRIMEIRA
    // gravação de um módulo ainda vazio passa por aqui e recebe PGRST116.
    // Acender "falha ao sincronizar" nesse instante acusaria queda de conexão
    // justamente quando a pessoa está criando o primeiro registro.
    tabela = () =>
      query({ data: null, error: Object.assign(new Error('Cannot coerce'), { code: 'PGRST116' }) })

    await expect(kvGetWithMeta('gmad_perfil_fotos')).rejects.toMatchObject({ code: 'PGRST116' })
    expect(getSyncStatusSnapshot().status).toBe('connected')
  })

  it('erro que NÃO é chave ausente continua marcando offline', async () => {
    // A distinção tem que ser cirúrgica: queda de rede e permissão negada
    // precisam continuar acendendo o indicador.
    tabela = () => query({ data: null, error: new Error('sem rede') })

    await expect(kvGetWithMeta('gmad_ativos_data')).rejects.toThrow('sem rede')
    expect(getSyncStatusSnapshot().status).toBe('offline')
  })

  it('com `padrao`, devolve updatedAt undefined — é o que CRIA a linha', async () => {
    // Esta é a peça que faz a primeira gravação de um módulo vazio funcionar:
    // updatedAt undefined leva o kvSet ao upsert incondicional, em vez de um
    // compare-and-swap contra uma versão que nunca existiu.
    tabela = () =>
      query({ data: null, error: Object.assign(new Error('Cannot coerce'), { code: 'PGRST116' }) })

    await expect(kvGetWithMeta('gmad_estoque_data', { padrao: [] })).resolves.toEqual({
      value: [],
      updatedAt: undefined,
    })
  })

  it('devolve valor e updated_at — é o updated_at que serve de base pro CAS', async () => {
    const updatedAt = '2026-08-21T12:00:00.000Z'
    tabela = () => query({ data: { value: [1, 2], updated_at: updatedAt }, error: null })

    await expect(kvGetWithMeta('gmad_ativos_log')).resolves.toEqual({
      value: [1, 2],
      updatedAt,
    })
  })
})

describe('kvSet', () => {
  it('sem expectedUpdatedAt, grava incondicionalmente via upsert', async () => {
    const registro = {}
    tabela = () => query({ data: null, error: null }, registro)

    await kvSet('gmad_ativos_data', { total: 1 })

    const metodos = registro.chamadas.map(([metodo]) => metodo)
    expect(metodos).toContain('upsert')
    expect(metodos).not.toContain('update')
  })

  it('com expectedUpdatedAt, filtra pelo updated_at esperado (compare-and-swap)', async () => {
    const registro = {}
    const esperado = '2026-08-21T12:00:00.000Z'
    tabela = () => query({ data: [{ key: 'gmad_ativos_data' }], error: null }, registro)

    await kvSet('gmad_ativos_data', { total: 2 }, { expectedUpdatedAt: esperado })

    // O segundo .eq() é a trava: sem ele o UPDATE pega a linha em qualquer
    // versão e a escrita concorrente é sobrescrita em silêncio.
    expect(registro.chamadas).toContainEqual(['eq', 'updated_at', esperado])
    expect(registro.chamadas).toContainEqual(['eq', 'key', 'gmad_ativos_data'])
  })

  it('lança KvConflictError quando nenhuma linha casa — outra sessão gravou antes', async () => {
    // data: [] é como o PostgREST relata "o UPDATE não encontrou linha":
    // sucesso HTTP, zero linhas afetadas. Confundir isso com sucesso é
    // exatamente a escrita perdida que o CAS existe pra evitar.
    tabela = () => query({ data: [], error: null })

    await expect(
      kvSet('gmad_ativos_data', { total: 2 }, { expectedUpdatedAt: 'versao-velha' }),
    ).rejects.toBeInstanceOf(KvConflictError)
  })

  it('conflito não marca offline: o banco respondeu, quem perdeu foi a corrida', async () => {
    tabela = () => query({ data: null, error: null })
    await kvSet('gmad_ativos_data', { total: 1 }) // garante 'connected' antes
    tabela = () => query({ data: [], error: null })

    await expect(
      kvSet('gmad_ativos_data', { total: 2 }, { expectedUpdatedAt: 'versao-velha' }),
    ).rejects.toBeInstanceOf(KvConflictError)

    // Marcar offline aqui acenderia "sem conexão" numa situação em que a
    // conexão está perfeita — e o retry do pushLog depende dessa distinção.
    expect(getSyncStatusSnapshot().status).toBe('connected')
  })

  it('erro de verdade no update marca offline', async () => {
    tabela = () => query({ data: null, error: new Error('permissão negada') })

    await expect(kvSet('gmad_ativos_data', { total: 2 })).rejects.toThrow('permissão negada')
    expect(getSyncStatusSnapshot().status).toBe('offline')
  })
})
