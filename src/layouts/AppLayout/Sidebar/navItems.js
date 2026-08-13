import { ROUTES } from '../../../constants/routes'
import {
  DashboardIcon,
  AssetsIcon,
  ContactsIcon,
  StockIcon,
  DownloadIcon,
  ScriptsIcon,
  InfraIcon,
  NetworkMonitorIcon,
  ClockIcon,
  ReportsIcon,
} from '../../../components/ui/Icon/icons'

export const NAV_ITEMS = [
  { to: ROUTES.dashboard, label: 'Painel geral', icon: DashboardIcon, end: true },
  { to: ROUTES.ativos, label: 'Ativos cadastrados', icon: AssetsIcon },
  { to: ROUTES.contatos, label: 'Contatos', icon: ContactsIcon },
  { to: ROUTES.estoque, label: 'Estoque', icon: StockIcon },
  { to: ROUTES.instaladores, label: 'Instaladores', icon: DownloadIcon },
  { to: ROUTES.scripts, label: 'Scripts', icon: ScriptsIcon },
  { to: ROUTES.infraestrutura, label: 'Infraestrutura', icon: InfraIcon },
  { to: ROUTES.monitoramento, label: 'Monitoramento de Rede', icon: NetworkMonitorIcon },
  { to: ROUTES.atividade, label: 'Atividade recente', icon: ClockIcon },
  { to: ROUTES.relatorios, label: 'Relatórios', icon: ReportsIcon },
]
