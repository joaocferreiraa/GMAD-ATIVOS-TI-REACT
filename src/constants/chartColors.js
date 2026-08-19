// Paleta categórica dos gráficos operacionais (ver --chart-1..8 em
// styles/tokens.css): azul vivo na frente e matizes bem separados, no lugar
// dos três verdes escuros + dois laranjas em sequência que embaçavam séries
// vizinhas. Hoje quem usa é o dashboard de Chamados; monitoramento e modo
// TV puxam a mesma família via SERIE_CORES (constants/monitoramento.js).
//
// A Visão geral (DashboardPage/DeptByUnit) fica FORA por decisão de
// produto: é a vitrine da marca, e lá os verdes e laranjas GMAD valem mais
// que o contraste entre séries. Cada uma daquelas telas declara a própria
// paleta, com o porquê no comentário. Não unifique sem perguntar.
//
// A atribuição é cíclica por índice: acima de 8 categorias as cores
// repetem, e a legenda/tooltip continua desambiguando pelo nome.
//
// Cores SEMÂNTICAS (status ok/atenção/perigo, prioridade de chamado) não
// entram aqui — lá a cor carrega significado e não pode ser sorteada por
// posição.
export const CHART_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
  'var(--chart-7)',
  'var(--chart-8)',
]
