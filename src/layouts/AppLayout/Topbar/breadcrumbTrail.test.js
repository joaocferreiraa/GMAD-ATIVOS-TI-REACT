import { describe, expect, it } from 'vitest'
import { breadcrumbTrail } from './breadcrumbTrail'
import { ROUTES } from '../../../constants/routes'

describe('breadcrumbTrail', () => {
  it('link solto vira uma trilha de um nível só', () => {
    expect(breadcrumbTrail(ROUTES.dashboard)).toEqual(['Painel geral'])
  })

  it('item de grupo vira grupo + página', () => {
    expect(breadcrumbTrail(ROUTES.estoque)).toEqual(['Inventário', 'Estoque'])
    expect(breadcrumbTrail(ROUTES.ajuda)).toEqual(['Configurações', 'Ajuda'])
  })

  it('rota aninhada escolhe o caminho mais específico, não o prefixo', () => {
    // '/chamados' é prefixo de '/chamados/painel' e os dois casam com a
    // segunda URL. Sem a ordenação por especificidade, a trilha de
    // '/chamados/painel' sairia como a da Central de Chamados.
    expect(breadcrumbTrail(ROUTES.chamados)).toEqual(['Chamados', 'Central de Chamados'])
    expect(breadcrumbTrail(ROUTES.chamadosDashboard)).toEqual(['Chamados', 'Indicadores'])
  })

  it('mesma coisa para as três abas de Rede, que compartilham prefixo', () => {
    expect(breadcrumbTrail(ROUTES.monitoramento)).toEqual(['Rede', 'Monitoramento'])
    expect(breadcrumbTrail(ROUTES.monitoramentoPainel)).toEqual(['Rede', 'Painel de Infra'])
  })

  it('sub-rota de uma página do menu herda a trilha da página', () => {
    expect(breadcrumbTrail(`${ROUTES.ativos}/123`)).toEqual(['Inventário', 'Ativos cadastrados'])
  })

  it('rota fora do menu não devolve trilha nenhuma', () => {
    // A raiz ('/') é prefixo de TODA rota. O que a impede de casar com tudo é
    // a checagem ser `pathname === to || pathname.startsWith(to + '/')` —
    // para '/' o segundo termo vira '//', que nada satisfaz. Trocar isso por
    // um startsWith cru faria toda rota desconhecida virar "Painel geral".
    expect(breadcrumbTrail('/rota-que-nao-existe')).toEqual([])
    expect(breadcrumbTrail(ROUTES.inventarioMaquinas)).toEqual([])
    expect(breadcrumbTrail(ROUTES.tv)).toEqual([])
  })

  it('devolve um array vazio, e não undefined, pra quem renderiza poder mapear direto', () => {
    expect(Array.isArray(breadcrumbTrail('/nada'))).toBe(true)
  })
})
