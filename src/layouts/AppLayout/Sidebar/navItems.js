import { ROUTES } from '../../../constants/routes'
import {
  DashboardIcon,
  AssetsIcon,
  PackageIcon,
  ContactsIcon,
  UserIcon,
  StockIcon,
  DownloadIcon,
  ScriptsIcon,
  InfraIcon,
  NetworkMonitorIcon,
  ClockIcon,
  ReportsIcon,
  HammerIcon,
  DatabaseIcon,
  WifiIcon,
} from '../../../components/ui/Icon/icons'

// Estrutura hierárquica da navegação: itens soltos (type 'link') ficam no
// topo; o restante é agrupado por domínio (type 'group') para caber mais
// funções sem lotar a barra — cada grupo abre/fecha como o acordeão de
// Infraestrutura. `key` identifica o grupo pra controle de expandido/
// recolhido e pra saber qual grupo conter a rota ativa.
//
// truncates: true — o rótulo é cortado mesmo com o menu expandido, então o
// tooltip continua útil ali mesmo fora do modo recolhido.
export const NAV_ITEMS = [
  { type: 'link', to: ROUTES.dashboard, label: 'Painel geral', icon: DashboardIcon, end: true },
  {
    type: 'group',
    key: 'inventario',
    label: 'Inventário',
    icon: PackageIcon,
    items: [
      { to: ROUTES.ativos, label: 'Ativos cadastrados', icon: AssetsIcon, truncates: true },
      { to: ROUTES.estoque, label: 'Estoque', icon: StockIcon },
    ],
  },
  {
    type: 'group',
    key: 'rede',
    label: 'Rede',
    icon: WifiIcon,
    items: [
      { to: ROUTES.infraestrutura, label: 'Infraestrutura', icon: InfraIcon },
      {
        to: ROUTES.monitoramento,
        label: 'Monitoramento de Rede',
        icon: NetworkMonitorIcon,
        truncates: true,
      },
    ],
  },
  {
    type: 'group',
    key: 'ferramentas',
    label: 'Ferramentas',
    icon: HammerIcon,
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
    items: [{ to: ROUTES.contatos, label: 'Contatos', icon: ContactsIcon }],
  },
  {
    type: 'group',
    key: 'dados',
    label: 'Dados',
    icon: DatabaseIcon,
    items: [
      { to: ROUTES.relatorios, label: 'Relatórios', icon: ReportsIcon },
      { to: ROUTES.atividade, label: 'Atividade recente', icon: ClockIcon, truncates: true },
    ],
  },
]

// Lista achatada de todos os itens navegáveis (sem os cabeçalhos de grupo) —
// usada no modo recolhido, onde só cabem ícones e não há espaço pra
// sub-menus.
export const FLAT_NAV_ITEMS = NAV_ITEMS.flatMap((entry) =>
  entry.type === 'group' ? entry.items : [entry],
)
