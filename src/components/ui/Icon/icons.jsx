// Ícones SVG inline portados 1:1 de site-ativos-ti-gmad-madville.html (sidebar,
// topbar e rodapé institucional). Cada um aceita props (className, width, height...)
// para ser reutilizado em contextos diferentes sem duplicar o markup do <svg>.

function IconBase({ children, ...props }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  )
}

export function DashboardIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </IconBase>
  )
}

export function AssetsIcon(props) {
  return (
    <IconBase {...props}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </IconBase>
  )
}

export function PackageIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </IconBase>
  )
}

export function UserIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </IconBase>
  )
}

export function DatabaseIcon(props) {
  return (
    <IconBase {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </IconBase>
  )
}

export function ShareIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 15V4" />
      <path d="m8 8 4-4 4 4" />
      <path d="M4 13v6a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-6" />
    </IconBase>
  )
}

export function ContactsIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  )
}

export function StockIcon(props) {
  return (
    <IconBase {...props}>
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </IconBase>
  )
}

export function DownloadIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </IconBase>
  )
}

export function ReportsIcon(props) {
  return (
    <IconBase {...props}>
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </IconBase>
  )
}

export function ScriptsIcon(props) {
  return (
    <IconBase {...props}>
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </IconBase>
  )
}

export function HammerIcon(props) {
  return (
    <IconBase {...props}>
      <path d="m15 12-8.5 8.5a2.12 2.12 0 1 1-3-3L12 9" />
      <path d="M17.64 15 22 10.64" />
      <path d="m20.91 11.7-1.25-1.25c-.6-.6-.93-1.4-.93-2.25v-.86L16.01 4.6a5.56 5.56 0 0 0-3.94-1.64H9l.92.82A6.18 6.18 0 0 1 12 8.4v1.56l2 2h2.47l2.26 1.91" />
    </IconBase>
  )
}

// InfraIcon saiu daqui: era cópia byte a byte do ServerIcon (mesmo rack de
// dois módulos), e o menu desenhava o mesmo glifo em "Rede" e na sub-aba
// "Infraestrutura" dentro dela. Agora Infraestrutura usa o ServerIcon
// direto, e o módulo Rede ganhou o RouterIcon.

export function UnitsIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </IconBase>
  )
}

export function ClockIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </IconBase>
  )
}

export function MenuIcon(props) {
  return (
    <IconBase {...props}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </IconBase>
  )
}

export function PanelIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </IconBase>
  )
}

export function BellIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </IconBase>
  )
}

export function LogoutIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </IconBase>
  )
}

export function LoginIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
      <polyline points="10 17 15 12 10 7" />
      <line x1="15" y1="12" x2="3" y2="12" />
    </IconBase>
  )
}

export function MoonIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </IconBase>
  )
}

export function SunIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </IconBase>
  )
}

export function FacebookIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </IconBase>
  )
}

export function InstagramIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </IconBase>
  )
}

export function LinkedInIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </IconBase>
  )
}

export function PhoneIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </IconBase>
  )
}

export function MailIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <polyline points="22,6 12,13 2,6" />
    </IconBase>
  )
}

export function CloseIcon(props) {
  return (
    <IconBase {...props}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </IconBase>
  )
}

export function ChevronDownIcon(props) {
  return (
    <IconBase {...props}>
      <polyline points="6 9 12 15 18 9" />
    </IconBase>
  )
}

export function CheckIcon(props) {
  return (
    <IconBase strokeWidth="2" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </IconBase>
  )
}

export function SpinnerIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </IconBase>
  )
}

// Ícones de categoria de equipamento e KPIs do Dashboard (ICON_PATHS do sistema original).
export function MonitorIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </IconBase>
  )
}

export function DisplayIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="5" width="18" height="12" rx="1.5" />
      <line x1="3" y1="15" x2="21" y2="15" />
    </IconBase>
  )
}

export function LaptopIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="4" width="16" height="10" rx="1" />
      <path d="M2 18h20l-1.5-3h-17L2 18z" />
    </IconBase>
  )
}

export function SmartphoneIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="6" y="2" width="12" height="20" rx="2" ry="2" />
      <line x1="12" y1="18" x2="12.01" y2="18" />
    </IconBase>
  )
}

export function PrinterIcon(props) {
  return (
    <IconBase {...props}>
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </IconBase>
  )
}

export function TvIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="2" y="7" width="20" height="15" rx="2" ry="2" />
      <polyline points="17 2 12 7 7 2" />
    </IconBase>
  )
}

export function BuildingIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <rect x="7" y="6.5" width="3" height="3" />
      <rect x="14" y="6.5" width="3" height="3" />
      <rect x="7" y="12.5" width="3" height="3" />
      <rect x="14" y="12.5" width="3" height="3" />
    </IconBase>
  )
}

export function DollarIcon(props) {
  return (
    <IconBase {...props}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </IconBase>
  )
}

export function EditIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </IconBase>
  )
}

export function TrashIcon(props) {
  return (
    <IconBase {...props}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </IconBase>
  )
}

export function RefreshIcon(props) {
  return (
    <IconBase {...props}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </IconBase>
  )
}

export function CopyIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </IconBase>
  )
}

export function StarIcon(props) {
  return (
    <IconBase {...props}>
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </IconBase>
  )
}

export function PlayIcon(props) {
  return (
    <IconBase {...props}>
      <polygon points="5 3 19 12 5 21 5 3" />
    </IconBase>
  )
}

export function EyeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  )
}

export function EyeOffIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a21.8 21.8 0 0 1 5.06-6.06M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 11 8 11 8a21.8 21.8 0 0 1-2.16 3.19" />
      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </IconBase>
  )
}

export function WifiIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12.55a11 11 0 0 1 14.08 0" />
      <path d="M1.42 9a16 16 0 0 1 21.16 0" />
      <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
      <line x1="12" y1="20" x2="12.01" y2="20" />
    </IconBase>
  )
}

export function ServerIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </IconBase>
  )
}

// Ícone da aba "Monitoramento de Rede" — pulso/atividade (distinto de
// ServerIcon/WifiIcon, já usados em Infraestrutura/Relatórios), pra
// representar monitoramento contínuo em vez de hardware ou sinal em si.
export function NetworkMonitorIcon(props) {
  return (
    <IconBase {...props}>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </IconBase>
  )
}

// Ticket destacável — o símbolo padrão de helpdesk (GLPI, Zendesk, Jira
// Service Desk usam variações dele). Substitui o sino no grupo Chamados,
// que lia como "notificações" e não como chamado de suporte.
export function TicketIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 9V7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v2a2 2 0 0 0 0 6v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-6z" />
      <line x1="13" y1="7" x2="13" y2="9" />
      <line x1="13" y1="15" x2="13" y2="17" />
    </IconBase>
  )
}

// Caixa de ferramentas — mais literal que a marreta (HammerIcon) pra um
// grupo que reúne instaladores e scripts.
export function ToolboxIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="2" y1="13" x2="22" y2="13" />
      <line x1="10" y1="13" x2="10" y2="15" />
      <line x1="14" y1="13" x2="14" y2="15" />
    </IconBase>
  )
}

// Balão de conversa — a Central de chamados é onde a conversa com o
// solicitante acontece (comentários, respostas via WhatsApp).
export function ConversationIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
    </IconBase>
  )
}

export function PlusIcon(props) {
  return (
    <IconBase {...props}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </IconBase>
  )
}

export function SearchIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </IconBase>
  )
}

// Pino de mapa — usado na Topbar ao lado do nome da(s) unidade(s).
export function LocationIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </IconBase>
  )
}

// -- Ícones do menu, 2ª geração ------------------------------------------
// Regra que orienta o conjunto: o glifo mais CONCRETO fica na sub-aba, e o
// mais abstrato no módulo que a contém. Por isso o rack de servidor desceu
// pra Infraestrutura e as barras ficaram só em Relatórios — antes o mesmo
// desenho aparecia em até três destinos diferentes.

// Prancheta com itens — módulo Inventário. Inventário aqui é o LEVANTAMENTO
// (o que existe e quanto), não a caixa: a caixa é o Estoque, sub-aba dele.
// Não é a pilha de caixas cogitada primeiro porque, reduzida a 18px, ela
// virava um bloco de retângulos igual ao DashboardIcon.
export function ClipboardListIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </IconBase>
  )
}

// Roteador com ondas — módulo Rede. Não é a árvore de nós cogitada primeiro:
// ela é feita de retângulos empilhados e apareceria colada ao ServerIcon da
// sub-aba Infraestrutura, no mesmo painel. As ondas separam de vez.
export function RouterIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="2" y="14" width="20" height="8" rx="2" />
      <path d="M6.01 18H6" />
      <path d="M10.01 18H10" />
      <path d="M15 10v4" />
      <path d="M17.84 7.17a4 4 0 0 0-5.66 0" />
      <path d="M20.66 4.34a8 8 0 0 0-11.31 0" />
    </IconBase>
  )
}

// Rosca — sub-aba Indicadores. Distingue dos Relatórios (barras): lá são
// séries e totais, aqui é composição de um todo. Os dois raios marcam as
// fatias; sem eles o desenho lê como alvo, não como gráfico.
export function DonutChartIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3.5v5" />
      <path d="m19.4 16.2-4.3-2.4" />
    </IconBase>
  )
}

// Etiqueta de patrimônio — sub-aba Ativos cadastrados. Substitui a lista
// genérica de antes, que servia pra qualquer listagem do site.
export function TagIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M12.59 2.59A2 2 0 0 0 11.17 2H4a2 2 0 0 0-2 2v7.17a2 2 0 0 0 .59 1.42l8.7 8.7a2.43 2.43 0 0 0 3.42 0l6.58-6.58a2.43 2.43 0 0 0 0-3.42Z" />
      <circle cx="7.5" cy="7.5" r="0.5" fill="currentColor" />
    </IconBase>
  )
}

// Velocímetro — sub-aba Painel de Infra. É painel AO VIVO (medida no
// instante), não relatório histórico, e o mostrador diz isso.
export function GaugeIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3.34 19a10 10 0 1 1 17.32 0" />
      <path d="m12 14 4-4" />
    </IconBase>
  )
}

// Ficha de contato — sub-aba Contatos. O ContactsIcon (duas pessoas) subiu
// pro módulo Pessoas, então esta precisa de desenho próprio: um cartão com
// a pessoa dentro, que é a ficha individual em vez do grupo.
export function ContactCardIcon(props) {
  return (
    <IconBase {...props}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M8 2v2" />
      <path d="M16 2v2" />
      <circle cx="12" cy="11" r="3" />
      <path d="M7 20v-1a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1" />
    </IconBase>
  )
}

// Chave — item "Trocar senha" no menu da conta. Não é o cadeado: cadeado diz
// "trancado/protegido" (estado), e o item é uma AÇÃO sobre a credencial.
export function KeyIcon(props) {
  return (
    <IconBase {...props}>
      <circle cx="7.5" cy="15.5" r="4.5" />
      <path d="m10.7 12.3 8.3-8.3" />
      <path d="m17 6 2.5 2.5" />
      <path d="m14.5 8.5 2.5 2.5" />
    </IconBase>
  )
}

// Relógio com seta de retorno — sub-aba Atividade recente. O ClockIcon puro
// diz "hora"; este diz "o que já passou", que é o conteúdo da tela.
export function HistoryIcon(props) {
  return (
    <IconBase {...props}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M12 7v5l4 2" />
    </IconBase>
  )
}
