import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  assetWarrantyInfo,
  fmtDate,
  greetingForHour,
  greetingName,
  initials,
  nameFromEmail,
  warrantyInfo,
} from './formatters'

// warrantyInfo e greetingForHour dependem do relógio. Sem congelar, os testes
// de fronteira passariam hoje e quebrariam sozinhos amanhã.
function congelarEm(iso) {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(iso))
}

afterEach(() => {
  vi.useRealTimers()
})

describe('warrantyInfo', () => {
  it('sem data, reporta ausência em vez de vencimento', () => {
    expect(warrantyInfo(null)).toEqual({ label: 'Sem garantia', cls: 'missing' })
    expect(warrantyInfo('')).toEqual({ label: 'Sem garantia', cls: 'missing' })
  })

  it('data passada é vencida, e o rótulo mostra quando venceu', () => {
    congelarEm('2026-08-21T10:00:00')
    expect(warrantyInfo('2026-08-20')).toEqual({
      label: 'Vencida (20/08/2026)',
      cls: 'expired',
    })
  })

  it('vence hoje ainda não conta como vencida', () => {
    // Fronteira em days === 0: o dia da expiração é o último dia coberto.
    congelarEm('2026-08-21T23:59:00')
    expect(warrantyInfo('2026-08-21')).toEqual({ label: 'Vence em 0d', cls: 'warn' })
  })

  it('60 dias ainda alerta; 61 já não', () => {
    congelarEm('2026-08-21T10:00:00')
    // É esta fronteira que o painel usa pra montar a lista de atenção
    // (ver useDashboardData) — mexer nela muda o que aparece lá.
    expect(warrantyInfo('2026-10-20').cls).toBe('warn')
    expect(warrantyInfo('2026-10-21').cls).toBe('ok')
  })

  it('não é afetada pela hora do dia — a comparação é por data', () => {
    congelarEm('2026-08-21T00:01:00')
    const cedo = warrantyInfo('2026-10-20')
    vi.setSystemTime(new Date('2026-08-21T23:58:00'))
    expect(warrantyInfo('2026-10-20')).toEqual(cedo)
  })
})

describe('assetWarrantyInfo', () => {
  it('cobra garantia de equipamento comum sem data', () => {
    expect(assetWarrantyInfo({ categoria: 'Notebook' }).cls).toBe('missing')
  })

  it('impressora alugada sem data fica neutra, não "Sem garantia"', () => {
    // Alugada não tem garantia própria a cobrar — marcar como faltando
    // encheria a tela de pendência que ninguém pode resolver.
    expect(assetWarrantyInfo({ categoria: 'Impressora', posse: 'Alugado' })).toEqual({
      label: '—',
      cls: 'none',
    })
  })

  it('impressora sem posse definida também fica neutra', () => {
    expect(assetWarrantyInfo({ categoria: 'Impressora' }).cls).toBe('none')
  })

  it('impressora comprada volta a cobrar a garantia', () => {
    expect(assetWarrantyInfo({ categoria: 'Impressora', posse: 'Comprado' }).cls).toBe('missing')
  })

  it('a exceção não engole uma data real', () => {
    congelarEm('2026-08-21T10:00:00')
    const info = assetWarrantyInfo({
      categoria: 'Impressora',
      posse: 'Alugado',
      garantiaAte: '2026-08-01',
    })
    expect(info.cls).toBe('expired')
  })
})

describe('nameFromEmail', () => {
  it('monta o nome a partir da parte local do e-mail', () => {
    expect(nameFromEmail('maria.souza@madville.com.br')).toBe('Maria Souza')
  })

  it('aceita hífen e sublinhado como separadores', () => {
    expect(nameFromEmail('ana-paula_lima@gmad.ti')).toBe('Ana Paula Lima')
  })

  it('usa a correção manual quando o e-mail está mapeado', () => {
    // Sem o override sairia "Joao Ferreira", sem acento — o e-mail não
    // carrega essa informação.
    expect(nameFromEmail('joao.ferreira@gmad.ti')).toBe('João Ferreira')
  })

  it('o override não depende de caixa nem de espaço em volta', () => {
    expect(nameFromEmail('  JOAO.FERREIRA@GMAD.TI  ')).toBe('João Ferreira')
  })

  it('sem e-mail, devolve a autoria genérica em vez de vazio', () => {
    expect(nameFromEmail(undefined)).toBe('Alguém da equipe')
    expect(nameFromEmail('')).toBe('Alguém da equipe')
  })
})

describe('greetingName', () => {
  it('usa só o primeiro nome por padrão', () => {
    expect(greetingName('maria.souza@madville.com.br')).toBe('Maria')
  })

  it('usa a forma curta do override quando existe', () => {
    expect(greetingName('joao.ferreira@gmad.ti')).toBe('João')
  })
})

describe('initials', () => {
  it('pega as duas primeiras iniciais', () => {
    expect(initials('Maria Souza Lima')).toBe('MS')
  })

  it('funciona com um nome só', () => {
    expect(initials('Maria')).toBe('M')
  })

  it('ignora espaços repetidos', () => {
    expect(initials('Maria   Souza')).toBe('MS')
  })
})

describe('greetingForHour', () => {
  it.each([
    ['2026-08-21T05:00:00', 'Bom dia'],
    ['2026-08-21T11:59:00', 'Bom dia'],
    ['2026-08-21T12:00:00', 'Boa tarde'],
    ['2026-08-21T17:59:00', 'Boa tarde'],
    ['2026-08-21T18:00:00', 'Boa noite'],
    ['2026-08-21T04:59:00', 'Boa noite'],
  ])('%s → %s', (iso, esperado) => {
    expect(greetingForHour(new Date(iso))).toBe(esperado)
  })
})

describe('fmtDate', () => {
  it('converte ISO para o formato brasileiro', () => {
    expect(fmtDate('2026-08-21')).toBe('21/08/2026')
  })

  it('sem data, devolve o travessão neutro', () => {
    expect(fmtDate(null)).toBe('—')
  })

  it('devolve a entrada intacta quando não é uma data ISO', () => {
    expect(fmtDate('sei lá')).toBe('sei lá')
  })
})
