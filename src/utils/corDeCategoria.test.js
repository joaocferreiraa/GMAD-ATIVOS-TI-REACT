import { describe, expect, it } from 'vitest'
import { corDeCategoria } from './corDeCategoria'

const CORES = ['c0', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8']

describe('corDeCategoria', () => {
  it('o mesmo setor devolve sempre a mesma cor', () => {
    // É a razão de existir da função: cada bloco ordena seus departamentos
    // por quantidade, então a POSIÇÃO de "Financeiro" muda de um bloco pro
    // outro. A cor não pode mudar junto.
    const primeira = corDeCategoria('Financeiro', CORES)

    expect(corDeCategoria('Financeiro', CORES)).toBe(primeira)
    expect(corDeCategoria('Financeiro', CORES)).toBe(primeira)
  })

  it('setores diferentes não caem todos na mesma cor', () => {
    const departamentos = [
      'Vendas',
      'Compras',
      'Financeiro',
      'Soluções',
      'Crédito e Cobrança',
      'Departamento Pessoal',
      'Processos e TI',
      'Tintas',
      'Arquiteta',
      'Recepção',
      'Showroom',
      'Técnico Iluminação',
      'Uso e Consumo',
    ]
    const distintas = new Set(departamentos.map((d) => corDeCategoria(d, CORES)))

    // Estes são os 13 departamentos reais do cartão de colaboradores, e com o
    // multiplicador escolhido (ver MULTIPLICADOR) eles ocupam a paleta
    // INTEIRA. Com o 31 clássico só 6 das 9 cores eram usadas e três setores
    // dividiam a mesma — cor estável, mas gráfico ilegível.
    //
    // Se este teste cair ao mexer no hash ou na paleta, refaça a medição
    // antes de só baixar o número esperado.
    expect(distintas.size).toBe(CORES.length)
  })

  it('devolve sempre uma cor da paleta recebida', () => {
    for (const nome of ['Vendas', 'Tintas', 'Setor Inventado Amanhã']) {
      expect(CORES).toContain(corDeCategoria(nome, CORES))
    }
  })

  it('ignora espaço nas pontas — mesmo setor digitado torto, mesma cor', () => {
    expect(corDeCategoria('  Vendas  ', CORES)).toBe(corDeCategoria('Vendas', CORES))
  })

  it('rótulo vazio ou ausente cai na primeira cor, sem quebrar', () => {
    expect(corDeCategoria('', CORES)).toBe('c0')
    expect(corDeCategoria(null, CORES)).toBe('c0')
    expect(corDeCategoria(undefined, CORES)).toBe('c0')
  })

  it('sem paleta, devolve undefined em vez de estourar', () => {
    expect(corDeCategoria('Vendas', [])).toBeUndefined()
    expect(corDeCategoria('Vendas', undefined)).toBeUndefined()
  })

  it('nome longo continua determinístico', () => {
    // O `| 0` a cada passo do hash existe pra isso: sem ele o acumulador
    // passa do inteiro seguro do JS e o resultado deixa de ser confiável.
    const longo = 'Departamento de Tecnologia da Informação e Processos Internos'
    expect(corDeCategoria(longo, CORES)).toBe(corDeCategoria(longo, CORES))
  })
})
