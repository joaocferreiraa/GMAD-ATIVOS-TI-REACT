// Caminhos de rota centralizados. Usados pelo router e por qualquer <Link>/<NavLink> na sidebar.
export const ROUTES = {
  login: '/login',
  dashboard: '/',
  ativos: '/ativos',
  estoque: '/estoque',
  // Inventário coletado pelo agente (specs das máquinas) — distinto de
  // `ativos`, que é o cadastro administrativo preenchido por pessoas.
  inventarioMaquinas: '/inventario-maquinas',
  contatos: '/contatos',
  instaladores: '/instaladores',
  scripts: '/scripts',
  infraestrutura: '/infraestrutura',
  monitoramento: '/monitoramento-rede',
  monitoramentoPainel: '/monitoramento-rede/painel',
  // Modo TV: mesmo painel, sem a casca do app (sidebar/topbar/rodapé), pra
  // ficar aberto num monitor de parede.
  tv: '/tv',
  atividade: '/atividade',
  relatorios: '/relatorios',
  chamados: '/chamados',
  chamadosDashboard: '/chamados/painel',
  ajuda: '/ajuda',
}
