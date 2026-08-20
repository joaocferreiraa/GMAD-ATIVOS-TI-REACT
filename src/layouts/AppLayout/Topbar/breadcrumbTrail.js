import { NAV_ITEMS } from '../Sidebar/navItems'

// Lista achatada com o caminho de rótulos de cada rota do menu: um link
// solto vira ['Painel geral']; um item de grupo vira ['Inventário',
// 'Estoque']. Montada uma vez no módulo (NAV_ITEMS é estático) pra a trilha
// não precisar percorrer a árvore a cada navegação.
const ROUTE_TRAILS = NAV_ITEMS.flatMap((entry) =>
  entry.type === 'group'
    ? entry.items.map(({ to, label }) => ({ to, trail: [entry.label, label] }))
    : [{ to: entry.to, trail: [entry.label] }],
)

// Rota mais específica primeiro: '/chamados' e '/chamados/painel' casam os
// dois com a segunda URL, e quem deve ganhar é o caminho mais longo.
const TRAILS_BY_SPECIFICITY = [...ROUTE_TRAILS].sort((a, b) => b.to.length - a.to.length)

// Rótulos do item de menu aberto, do grupo até a página. Devolve [] pra
// qualquer rota fora do menu (nada a exibir, em vez de uma trilha vazia
// ocupando espaço).
//
// Morava junto de um componente Breadcrumb próprio, que desenhava a trilha
// no topo do CONTEÚDO, acima do título de cada página. A trilha subiu pra
// barra (ver Topbar) e o componente saiu: nos dois lugares ela apareceria
// duas vezes na mesma tela, a segunda logo acima de um <h1> que já repete o
// último rótulo.
export function breadcrumbTrail(pathname) {
  const match = TRAILS_BY_SPECIFICITY.find(
    ({ to }) => pathname === to || pathname.startsWith(`${to}/`),
  )
  return match ? match.trail : []
}
