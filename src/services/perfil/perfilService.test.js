import { beforeEach, describe, expect, it, vi } from 'vitest'

const { kvGet, kvGetWithMeta, kvSet } = vi.hoisted(() => ({
  kvGet: vi.fn(),
  kvGetWithMeta: vi.fn(),
  kvSet: vi.fn(),
}))

// Espalha o módulo real e troca só o I/O — KvConflictError precisa ser a
// classe de verdade, porque o retry decide por `instanceof`.
vi.mock('../supabase/kvStore', async (importOriginal) => {
  const real = await importOriginal()
  return { ...real, kvGet, kvGetWithMeta, kvSet }
})

const { KvConflictError } = await import('../supabase/kvStore')
const { getFotosPerfil, salvarFotoPerfil } = await import('./perfilService')

beforeEach(() => {
  kvGet.mockReset()
  kvGetWithMeta.mockReset()
  kvSet.mockReset()
})

describe('getFotosPerfil', () => {
  it('devolve o mapa gravado', async () => {
    kvGet.mockResolvedValue({ 'joao@gmad.ti': 'data:image/jpeg;base64,abc' })

    await expect(getFotosPerfil()).resolves.toEqual({
      'joao@gmad.ti': 'data:image/jpeg;base64,abc',
    })
  })

  it('pede mapa vazio como padrão — chave ausente não é falha', async () => {
    kvGet.mockResolvedValue({})

    await expect(getFotosPerfil()).resolves.toEqual({})
    expect(kvGet).toHaveBeenCalledWith('gmad_perfil_fotos', { padrao: {} })
  })

  it('falha de verdade PROPAGA em vez de virar mapa vazio', async () => {
    // Aqui havia um `catch { return {} }` aberto: queda de rede e sessão
    // expirada viravam "ninguém tem foto", sem nada na tela indicando que só
    // não deu pra ler. Propagar deixa o React Query tentar de novo e o
    // indicador de sincronização acusar o problema.
    kvGet.mockRejectedValue(new Error('sem rede'))

    await expect(getFotosPerfil()).rejects.toThrow('sem rede')
  })
})

describe('salvarFotoPerfil', () => {
  it('exige usuário', async () => {
    await expect(salvarFotoPerfil('', 'data:...')).rejects.toThrow(/Sem usuário/)
  })

  it('acrescenta a foto ao mapa sem apagar a dos outros', async () => {
    kvGetWithMeta.mockResolvedValue({ value: { 'maria@gmad.ti': 'foto-maria' }, updatedAt: 'v1' })
    kvSet.mockResolvedValue(undefined)

    await salvarFotoPerfil('joao@gmad.ti', 'foto-joao')

    expect(kvSet.mock.calls[0][1]).toEqual({
      'maria@gmad.ti': 'foto-maria',
      'joao@gmad.ti': 'foto-joao',
    })
    expect(kvSet.mock.calls[0][2]).toEqual({ expectedUpdatedAt: 'v1' })
  })

  it('chave ainda inexistente: grava incondicionalmente e cria a linha', async () => {
    // updatedAt undefined é o que leva o kvSet ao upsert, em vez de um
    // compare-and-swap contra uma versão que nunca existiu.
    kvGetWithMeta.mockResolvedValue({ value: {}, updatedAt: undefined })
    kvSet.mockResolvedValue(undefined)

    await salvarFotoPerfil('joao@gmad.ti', 'foto-joao')

    expect(kvGetWithMeta).toHaveBeenCalledWith('gmad_perfil_fotos', { padrao: {} })
    expect(kvSet.mock.calls[0][2]).toEqual({ expectedUpdatedAt: undefined })
  })

  it('erro de leitura que não seja chave ausente NÃO grava', async () => {
    // O mais importante daqui: a chave pode existir com fotos de outras
    // pessoas que não conseguimos ler agora. Gravar por cima apagaria todas.
    kvGetWithMeta.mockRejectedValue(new Error('permissão negada'))

    await expect(salvarFotoPerfil('joao@gmad.ti', 'foto')).rejects.toThrow('permissão negada')
    expect(kvSet).not.toHaveBeenCalled()
  })

  it('em conflito, relê e tenta de novo preservando a foto da outra sessão', async () => {
    kvGetWithMeta
      .mockResolvedValueOnce({ value: {}, updatedAt: 'v1' })
      .mockResolvedValueOnce({ value: { 'maria@gmad.ti': 'foto-maria' }, updatedAt: 'v2' })
    kvSet.mockRejectedValueOnce(new KvConflictError('gmad_perfil_fotos')).mockResolvedValueOnce()

    await salvarFotoPerfil('joao@gmad.ti', 'foto-joao')

    expect(kvSet).toHaveBeenCalledTimes(2)
    expect(kvSet.mock.calls[1][1]).toEqual({
      'maria@gmad.ti': 'foto-maria',
      'joao@gmad.ti': 'foto-joao',
    })
  })

  it('desiste depois de 3 conflitos, lançando', async () => {
    // Diferente do log de atividade: aqui a pessoa escolheu uma foto e clicou
    // salvar, então falhar em silêncio deixaria a tela mentindo.
    kvGetWithMeta.mockResolvedValue({ value: {}, updatedAt: 'v1' })
    kvSet.mockRejectedValue(new KvConflictError('gmad_perfil_fotos'))

    await expect(salvarFotoPerfil('joao@gmad.ti', 'foto')).rejects.toBeInstanceOf(KvConflictError)
    expect(kvSet).toHaveBeenCalledTimes(3)
  })
})
