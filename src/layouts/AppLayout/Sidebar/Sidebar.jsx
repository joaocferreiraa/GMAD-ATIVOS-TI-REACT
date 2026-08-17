import { useContext, useEffect, useLayoutEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { HoverTooltipContext } from '../../../contexts/HoverTooltipContext'
import { nameFromEmail } from '../../../utils/formatters'
import { NAV_ITEMS, FLAT_NAV_ITEMS } from './navItems'
import SidebarModeMenu from './SidebarModeMenu'
import SidebarGroupFlyout from './SidebarGroupFlyout'
import styles from './Sidebar.module.css'

function isGroupActive(group, pathname) {
  return group.items.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`))
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
  const [flyoutRoute, setFlyoutRoute] = useState(location.pathname)
  if (location.pathname !== flyoutRoute) {
    setFlyoutRoute(location.pathname)
    if (flyout) setFlyout(null)
  }

  function toggleFlyout(key, anchorEl) {
    hideTooltip()
    setFlyout((current) => (current?.key === key ? null : { key, anchorEl }))
  }

  const flyoutGroup = flyout
    ? NAV_ITEMS.find((entry) => entry.type === 'group' && entry.key === flyout.key)
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
  // — nesse layout não há como abrir um flyout ao lado, então usa a lista
  // achatada (sem agrupamento) independente do modo da sidebar.
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

  return (
    <nav
      data-sidebar-hover-zone=""
      className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${peek ? styles.peek : ''}`}
    >
      <div className={styles.nav}>
        {isMobile
          ? FLAT_NAV_ITEMS.map(({ to, label, icon: Icon, end, truncates }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `${styles.navButton} ${isActive ? styles.active : ''}`}
                {...(truncates ? bindTooltip(label) : {})}
              >
                <span className={styles.navIcon}>
                  <Icon />
                </span>
                <span className={styles.label}>{label}</span>
              </NavLink>
            ))
          : NAV_ITEMS.map((entry) => {
              if (entry.type === 'link') {
                const { to, label, icon: Icon, end, truncates } = entry
                return (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `${styles.navButton} ${isActive ? styles.active : ''}`}
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
                  className={`${styles.navButton} ${active ? styles.active : ''} ${flyoutOpen ? styles.flyoutTrigger : ''}`}
                  aria-haspopup="menu"
                  aria-expanded={flyoutOpen}
                  onClick={(event) => toggleFlyout(key, event.currentTarget)}
                  {...(!flyoutOpen && (collapsed || entry.truncates) ? bindTooltip(label) : {})}
                >
                  <span className={styles.navIcon}>
                    <Icon />
                  </span>
                  <span className={styles.label}>{label}</span>
                </button>
              )
            })}
      </div>

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
