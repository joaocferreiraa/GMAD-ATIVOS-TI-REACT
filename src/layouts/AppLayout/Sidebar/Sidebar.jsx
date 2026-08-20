import { useContext, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { HoverTooltipContext } from '../../../contexts/HoverTooltipContext'
import { nameFromEmail } from '../../../utils/formatters'
import { NAV_ITEMS } from './navItems'
import SidebarModeMenu from './SidebarModeMenu'
import SidebarGroupFlyout from './SidebarGroupFlyout'
import { ChevronDownIcon } from '../../../components/ui/Icon/icons'
import styles from './Sidebar.module.css'

// Hover-intent do flyout (ver o efeito lá embaixo). Curtos o bastante pra
// não parecer travado, longos o bastante pra o painel não piscar em cada
// grupo que o cursor cruza de passagem.
const HOVER_ABRIR_MS = 110
const HOVER_FECHAR_MS = 220

function isGroupActive(group, pathname) {
  return group.items.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`))
}

// Grupo que contém a rota atual, ou null quando a rota é um link solto
// (Painel geral). No mobile é ele que decide qual módulo já nasce aberto.
function grupoDaRota(pathname) {
  const grupo = NAV_ITEMS.find((entry) => entry.type === 'group' && isGroupActive(entry, pathname))
  return grupo?.key ?? null
}

export default function Sidebar() {
  const { collapsed: layoutCollapsed, mode, hovering, setHovering } = useSidebarState()
  // No modo "expandir ao passar o mouse" a barra reserva o espaço estreito
  // (ver SidebarProvider) mas se abre por cima do conteúdo enquanto o mouse
  // está sobre ela — só aí ela deve se comportar (rótulos, grupos, divisor)
  // como se estivesse expandida de verdade.
  const peek = mode === 'hover' && hovering
  const collapsed = layoutCollapsed && !peek
  const { user } = useAuth()
  const displayName = nameFromEmail(user?.email)
  const bindTooltip = useHoverTooltip()
  const { hideTooltip } = useContext(HoverTooltipContext)
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches,
  )
  // Todo grupo abre num painel ao lado (ver SidebarGroupFlyout), nunca num
  // acordeão embutido — a barra e os ícones ficam estáticos independente do
  // modo (expandida, recolhida ou hover), igual ao rail do Supabase.
  // `anchorEl` vem do próprio evento de clique: não precisa de um ref por
  // botão, já que só um flyout fica aberto por vez. O clique-fora e o Esc
  // são tratados dentro do próprio SidebarGroupFlyout (ele sabe distinguir
  // um clique nos seus itens de um clique realmente fora).
  const [flyout, setFlyout] = useState(null) // { key, anchorEl } | null

  function closeFlyout() {
    setFlyout(null)
  }

  // Navegar (seja por um item do flyout ou por um link solto da barra)
  // sempre fecha o flyout aberto. Ajustado durante o render (padrão do
  // React pra "resetar estado quando algo muda") em vez de um efeito — um
  // efeito rodaria depois do paint e causaria um render em cascata.
  //
  // No mobile não há flyout (não há espaço ao lado): o módulo tocado abre as
  // abas numa segunda linha, e é `mobileGroup` que guarda qual está aberto.
  // Ao trocar de rota ele passa a seguir o grupo da rota nova — assim, ao
  // navegar para uma aba, as irmãs dela continuam à vista, e chegar por fora
  // (busca, notificação) abre sozinho o módulo correspondente.
  const [flyoutRoute, setFlyoutRoute] = useState(location.pathname)
  const [mobileGroup, setMobileGroup] = useState(() => grupoDaRota(location.pathname))
  if (location.pathname !== flyoutRoute) {
    setFlyoutRoute(location.pathname)
    if (flyout) setFlyout(null)
    setMobileGroup(grupoDaRota(location.pathname))
  }

  // Abre sem alternar: como o hover (ver efeito abaixo) já deixa o painel
  // aberto quando o cursor chega no botão, um clique que fechasse só faria
  // o painel piscar — o mousemove seguinte, com o cursor ainda em cima,
  // reabriria na hora. Fechar é por Esc, clique fora ou sair com o mouse.
  // Pelo teclado (Tab + Enter) não há hover, e este mesmo handler abre.
  // Metade "teclado" do bindTooltip, pros botões de grupo. O tooltip de
  // mouse deles saiu quando o hover passou a abrir o painel: os dois
  // disparavam no mesmo gesto, então o rótulo piscava e o menu vinha logo
  // atrás. O painel já mostra o rótulo no cabeçalho, com o mesmo ícone.
  // Pelo Tab não há hover nem flyout — ali o tooltip segue sendo a única
  // pista do que é o ícone com a barra recolhida.
  function bindTooltipFoco(label) {
    const { onFocus, onBlur } = bindTooltip(label)
    return { onFocus, onBlur }
  }

  function openFlyout(key, anchorEl) {
    hideTooltip()
    setFlyout((current) => (current?.key === key ? current : { key, anchorEl }))
  }

  const flyoutGroup = flyout
    ? NAV_ITEMS.find((entry) => entry.type === 'group' && entry.key === flyout.key)
    : null

  const mobileGroupItems = mobileGroup
    ? NAV_ITEMS.find((entry) => entry.type === 'group' && entry.key === mobileGroup)?.items
    : null

  // Todo link/botão da barra só recebe o tooltip (bindTooltip) quando
  // `collapsed` é true. No modo hover, entrar com o mouse num ícone dispara
  // ao mesmo tempo o mouseenter do próprio ícone (mostra o tooltip) e o da
  // <nav> (peek → collapsed vira false no mesmo render) — os handlers de
  // mouseleave do ícone somem junto com o bind, então nada nunca chama
  // hideTooltip() e ele fica preso na tela por cima do rótulo que acabou de
  // aparecer. Fechar aqui, toda vez que `collapsed` muda, resolve pra
  // qualquer item (link solto ou grupo), sem depender da ordem dos eventos
  // de mouse. useLayoutEffect (não useEffect) pra isso rodar antes do
  // navegador pintar o frame seguinte, sem o tooltip chegar a "piscar".
  useLayoutEffect(() => {
    hideTooltip()
  }, [collapsed, hideTooltip])

  // A barra vira uma faixa horizontal abaixo de 861px (ver Sidebar.module.css)
  // — nesse layout não há como abrir um flyout ao lado, então o módulo tocado
  // revela as abas numa segunda linha logo abaixo.
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 860px)')
    const handleChange = (event) => setIsMobile(event.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  // "hovering" via mousemove no document (não onMouseEnter/onMouseLeave na
  // <nav>) — o flyout do grupo (ver SidebarGroupFlyout) é portado pro body,
  // fora da <nav> no DOM; um par de enter/leave por elemento se perde fácil
  // (mouse passa pela <nav>, sai, entra no flyout — cada um só sabe da
  // própria borda) e a barra ficava presa aberta ou fechava embaixo do
  // flyout ainda aberto. Um único listener global, recalculando a cada
  // movimento se o cursor está sobre ALGUM elemento marcado com
  // data-sidebar-hover-zone (a <nav> e o painel do flyout), não depende de
  // pares de evento se corresponderem — só data.sidebar-hover-zone (verdade
  // ou mentira) a cada instante. Só liga no modo hover: nos outros dois o
  // resultado não muda nada (peek exige mode === 'hover').
  useEffect(() => {
    if (mode !== 'hover') return undefined
    function handleMouseMove(event) {
      setHovering(Boolean(event.target.closest('[data-sidebar-hover-zone]')))
    }
    document.addEventListener('mousemove', handleMouseMove)
    return () => document.removeEventListener('mousemove', handleMouseMove)
  }, [mode, setHovering])

  // Abrir/fechar o flyout com o mouse, sem precisar clicar. Mesmo mousemove
  // único no document da lógica de peek acima, e pelo mesmo motivo: o painel
  // é portado pro body (ver SidebarGroupFlyout), então pares de
  // mouseenter/mouseleave entre o botão e o painel se perdem no caminho —
  // recalcular a cada movimento onde o cursor ESTÁ não depende de eventos se
  // corresponderem.
  //
  // Os dois atrasos existem por motivos diferentes:
  //  - abrir: sem ele, atravessar a barra na diagonal pra chegar no conteúdo
  //    abriria e fecharia o painel de cada grupo do caminho;
  //  - fechar: entre o botão e o painel há um vão de 8px (ver o `left` em
  //    SidebarGroupFlyout) onde o cursor não está sobre nenhum dos dois, e
  //    fechar ali cortaria o caminho até os itens.
  // Trocar de um grupo aberto pro irmão é imediato: com um painel já aberto
  // a intenção não está mais em dúvida.
  //
  // No mobile não roda: lá não há flyout (as abas abrem em segunda linha) e
  // nem hover de verdade.
  // Espelho do `flyout` em ref pra o listener não precisar dele nas deps —
  // senão o mousemove seria desligado e religado a cada abertura. Sincronia
  // em useLayoutEffect (não useEffect): roda antes do navegador pintar e,
  // portanto, antes do mousemove seguinte, então o handler nunca lê um
  // estado atrasado.
  const flyoutAtualRef = useRef(null)
  useLayoutEffect(() => {
    flyoutAtualRef.current = flyout
  }, [flyout])

  useEffect(() => {
    if (isMobile) return undefined
    let timer = null

    function limparTimer() {
      if (timer) clearTimeout(timer)
      timer = null
    }

    function agendar(acao, atraso) {
      limparTimer()
      timer = setTimeout(() => {
        timer = null
        acao()
      }, atraso)
    }

    function abrir(key, anchorEl) {
      hideTooltip()
      setFlyout({ key, anchorEl })
    }

    function handleMouseMove(event) {
      const botao = event.target.closest('[data-sidebar-group]')
      if (botao) {
        const { sidebarGroup: key } = botao.dataset
        const atual = flyoutAtualRef.current
        if (atual?.key === key) limparTimer()
        else if (atual) {
          limparTimer()
          abrir(key, botao)
        } else agendar(() => abrir(key, botao), HOVER_ABRIR_MS)
        return
      }
      // Sobre o painel aberto: segura. Fora de tudo: fecha se havia algo
      // aberto, senão só cancela uma abertura que estava pra acontecer (o
      // cursor passou de raspão por um grupo e seguiu).
      if (event.target.closest('[data-sidebar-flyout]')) limparTimer()
      else if (flyoutAtualRef.current) agendar(() => setFlyout(null), HOVER_FECHAR_MS)
      else limparTimer()
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      limparTimer()
    }
  }, [isMobile, hideTooltip])

  return (
    <nav
      data-sidebar-hover-zone=""
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${peek ? styles.peek : ''}`}
    >
      <div className={styles.nav}>
        {isMobile
          ? NAV_ITEMS.map((entry) => {
              if (entry.type === 'link') {
                const { to, label, icon: Icon, end } = entry
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `${styles.navButton} ${isActive ? styles.active : ''}`
                    }
                  >
                    <span className={styles.navIcon}>
                      <Icon />
                    </span>
                    <span className={styles.label}>{label}</span>
                  </NavLink>
                )
              }

              const { key, label, icon: Icon } = entry
              const aberto = mobileGroup === key
              return (
                <button
                  key={key}
                  type="button"
                  className={`${styles.navButton} ${isGroupActive(entry, location.pathname) ? styles.active : ''}`}
                  aria-expanded={aberto}
                  onClick={() => setMobileGroup(aberto ? null : key)}
                >
                  <span className={styles.navIcon}>
                    <Icon />
                  </span>
                  <span className={styles.label}>{label}</span>
                  {/* Chevron: sem ele nada distingue um módulo, que abre as
                      abas, de "Painel geral", que navega direto. */}
                  <span
                    className={`${styles.chevron} ${aberto ? styles.chevronAberto : ''}`}
                    aria-hidden="true"
                  >
                    <ChevronDownIcon />
                  </span>
                </button>
              )
            })
          : NAV_ITEMS.map((entry) => {
              if (entry.type === 'link') {
                const { to, label, icon: Icon, end, truncates } = entry
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) =>
                      `${styles.navButton} ${isActive ? styles.active : ''}`
                    }
                    {...(collapsed || truncates ? bindTooltip(label) : {})}
                  >
                    <span className={styles.navIcon}>
                      <Icon />
                    </span>
                    <span className={styles.label}>{label}</span>
                  </NavLink>
                )
              }

              const { key, label, icon: Icon } = entry
              const active = isGroupActive(entry, location.pathname)
              const flyoutOpen = flyout?.key === key

              return (
                <button
                  key={key}
                  type="button"
                  // data-sidebar-group: é por ele que o mousemove acima
                  // descobre sobre qual grupo o cursor está, sem um ref por
                  // botão (o próprio elemento vira o `anchorEl` do painel).
                  data-sidebar-group={key}
                  className={`${styles.navButton} ${active ? styles.active : ''} ${flyoutOpen ? styles.flyoutTrigger : ''}`}
                  aria-haspopup="menu"
                  aria-expanded={flyoutOpen}
                  onClick={(event) => openFlyout(key, event.currentTarget)}
                  {...(!flyoutOpen && (collapsed || entry.truncates)
                    ? bindTooltipFoco(label)
                    : {})}
                >
                  <span className={styles.navIcon}>
                    <Icon />
                  </span>
                  <span className={styles.label}>{label}</span>
                </button>
              )
            })}
      </div>

      {/* Abas do módulo aberto, só no mobile: no desktop elas moram no painel
          lateral (SidebarGroupFlyout), que aqui não teria espaço ao lado. */}
      {isMobile && mobileGroupItems && (
        <div className={styles.subNav}>
          {mobileGroupItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => `${styles.subButton} ${isActive ? styles.active : ''}`}
            >
              <span className={styles.navIcon}>
                <Icon />
              </span>
              <span className={styles.label}>{label}</span>
            </NavLink>
          ))}
        </div>
      )}

      <div className={styles.bottom}>
        {!collapsed && <div className={styles.greeting}>Olá, {displayName}</div>}
        <div className={`${styles.footerRow} ${collapsed ? styles.footerRowCollapsed : ''}`}>
          <SidebarModeMenu />
        </div>
      </div>

      {flyoutGroup && (
        <SidebarGroupFlyout group={flyoutGroup} anchorEl={flyout.anchorEl} onClose={closeFlyout} />
      )}
    </nav>
  )
}
