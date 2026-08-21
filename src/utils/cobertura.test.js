import { describe, expect, it } from 'vitest'
import { resumoFinanceiro } from './cobertura'

const comPreco = (preco) => ({ preco })

describe('resumoFinanceiro', () => {
  it('soma os preços e conta quantos ativos sustentam a soma', () => {
    const r = resumoFinanceiro([comPreco('100'), comPreco('50'), {}])

    expect(r.invest).toBe(150)
    expect(r.total).toBe(3)
    expect(r.comPreco).toBe(2)
  })

  it('a média divide por quem tem preço, não pelo total', () => {
    // O erro que isto tranca: `invest / total` diluía a soma por todos os
    // ativos sem preço. Com 2 de 4 preenchidos daria 37,50 — um número que
    // não é a média de nada.
    const r = resumoFinanceiro([comPreco('100'), comPreco('50'), {}, {}])

    expect(r.medio).toBe(75)
  })

  it('aceita preço como texto, que é como vem do formulário', () => {
    expect(resumoFinanceiro([comPreco('1397.67')]).invest).toBeCloseTo(1397.67)
  })

  it('preço zero conta como cadastrado e soma nada', () => {
    // Zero é um preço informado — diferente de campo em branco. Tratá-lo como
    // ausente faria um ativo doado sumir da contagem de cobertura.
    const r = resumoFinanceiro([comPreco('0'), comPreco('100')])

    expect(r.comPreco).toBe(2)
    expect(r.invest).toBe(100)
    expect(r.medio).toBe(50)
  })

  it.each([[undefined], [''], ['   '], [null], ['sei lá'], ['R$ 100']])(
    'preço %p não conta como cadastrado',
    (valor) => {
      const r = resumoFinanceiro([comPreco(valor), comPreco('100')])

      expect(r.comPreco).toBe(1)
      expect(r.invest).toBe(100)
    },
  )

  it('recusa preço em formato brasileiro em vez de somar errado', () => {
    // parseFloat('1.397,67') devolve 1.397 — somaria R$ 1,40 caladamente e o
    // total sairia menor sem nada na tela indicando erro. Number() devolve
    // NaN, que é o mesmo critério do validador do formulário: o que o
    // cadastro recusa na entrada, esta conta recusa na leitura.
    const r = resumoFinanceiro([comPreco('1.397,67')])

    expect(r.comPreco).toBe(0)
    expect(r.invest).toBe(0)
  })

  it('aceita número puro, não só texto', () => {
    expect(resumoFinanceiro([{ preco: 1397.67 }]).invest).toBeCloseTo(1397.67)
  })

  it('sem nenhum preço, a média é null e não zero', () => {
    // 0 seria lido na tela como "os ativos custaram zero". Não existe média
    // de conjunto vazio — quem exibe troca null por "—".
    const r = resumoFinanceiro([{}, {}])

    expect(r.medio).toBeNull()
    expect(r.invest).toBe(0)
  })

  it('parcial acusa quando o número não fala pelo parque inteiro', () => {
    expect(resumoFinanceiro([comPreco('10'), {}]).parcial).toBe(true)
  })

  it('parcial fica falso sozinho quando todo mundo tem preço', () => {
    // É o que faz a ressalva do KPI sumir sem ninguém lembrar de removê-la.
    expect(resumoFinanceiro([comPreco('10'), comPreco('20')]).parcial).toBe(false)
  })

  it('lista vazia não quebra nem inventa cobertura parcial', () => {
    const r = resumoFinanceiro([])

    expect(r).toEqual({ total: 0, comPreco: 0, invest: 0, medio: null, parcial: false })
  })

  it('sem argumento, devolve o mesmo resumo vazio', () => {
    expect(resumoFinanceiro().total).toBe(0)
  })
})
