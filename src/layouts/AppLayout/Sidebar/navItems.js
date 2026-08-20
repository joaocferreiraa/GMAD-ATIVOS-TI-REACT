import { ROUTES } from '../../../constants/routes'
import {
  DashboardIcon,
  AssetsIcon,
  PackageIcon,
  PhoneIcon,
  UserIcon,
  StockIcon,
  DownloadIcon,
  ScriptsIcon,
  InfraIcon,
  NetworkMonitorIcon,
  ClockIcon,
  ReportsIcon,
  ToolboxIcon,
  DatabaseIcon,
  ServerIcon,
  TicketIcon,
  ConversationIcon,
} from '../../../components/ui/Icon/icons'

// Estrutura hierárquica da navegação: itens soltos (type 'link') ficam no
// topo; o restante é agrupado por domínio (type 'group') para caber mais
// funções sem lotar a barra. `key` identifica o grupo pra controle de
// aberto/fechado e pra saber qual grupo contém a rota ativa.
//
// Os dois layouts usam a MESMA estrutura, mudando só como o grupo se abre:
// no desktop, num painel ao lado (SidebarGroupFlyout); no mobile, numa
// segunda linha da faixa horizontal — ver Sidebar.jsx.
//
// Chamados vem logo depois do Painel geral por ser o módulo de uso diário
// da equipe — os demais grupos são consulta pontual.
//
// truncates: true — o rótulo é cortado mesmo com o menu expandido, então o
// tooltip continua útil ali mesmo fora do modo recolhido. Hoje nenhum item
// precisa: a barra (212px) comporta o rótulo mais longo inteiro. A flag
// segue disponível pra quando um item novo não couber.
export const NAV_ITEMS = [
  { type: 'link', to: ROUTES.dashboard, label: 'Painel geral', icon: DashboardIcon, end: true },
  {
    type: 'group',
    key: 'chamados',
    label: 'Chamados',
    icon: TicketIcon,
    items: [
      { to: ROUTES.chamados, label: 'Central de Chamados', icon: ConversationIcon },
      { to: ROUTES.chamadosDashboard, label: 'Indicadores', icon: ReportsIcon },
    ],
  },
  {
    type: 'group',
    key: 'inventario',
    label: 'Inventário',
    icon: PackageIcon,
    items: [
      { to: ROUTES.ativos, label: 'Ativos cadastrados', icon: AssetsIcon },
      { to: ROUTES.estoque, label: 'Estoque', icon: StockIcon },
    ],
  },
  {
    type: 'group',
    key: 'rede',
    label: 'Rede',
    icon: ServerIcon,
    items: [
      { to: ROUTES.infraestrutura, label: 'Infraestrutura', icon: InfraIcon },
      { to: ROUTES.monitoramento, label: 'Monitoramento', icon: NetworkMonitorIcon },
      { to: ROUTES.monitoramentoPainel, label: 'Painel de Infra', icon: ReportsIcon },
    ],
  },
  {
    type: 'group',
    key: 'ferramentas',
    label: 'Ferramentas',
    icon: ToolboxIcon,
    items: [
      { to: ROUTES.instaladores, label: 'Instaladores', icon: DownloadIcon },
      { to: ROUTES.scripts, label: 'Scripts', icon: ScriptsIcon },
    ],
  },
  {
    type: 'group',
    key: 'pessoas',
    label: 'Pessoas',
    icon: UserIcon,
    items: [{ to: ROUTES.contatos, label: 'Contatos', icon: PhoneIcon }],
  },
  {
    type: 'group',
    key: 'dados',
    label: 'Dados',
    icon: DatabaseIcon,
    items: [
      { to: ROUTES.relatorios, label: 'Relatórios', icon: ReportsIcon },
      { to: ROUTES.atividade, label: 'Atividade recente', icon: ClockIcon },
    ],
  },
]
