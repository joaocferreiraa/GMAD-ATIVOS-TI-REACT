import { useContext, useEffect, useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { HoverTooltipContext } from '../../../contexts/HoverTooltipContext'
import { nameFromEmail } from '../../../utils/formatters'
import logo from '../../../assets/images/gmad-logo.png'
import { ChevronDownIcon } from '../../../components/ui/Icon/icons'
import { NAV_ITEMS, FLAT_NAV_ITEMS } from './navItems'
import styles from './Sidebar.module.css'

function isGroupActive(group, pathname) {
  return group.items.some(({ to }) => pathname === to || pathname.startsWith(`${to}/`))
}

export default function Sidebar() {
  const { collapsed, toggleSidebar } = useSidebarState()
  const { user } = useAuth()
  const displayName = nameFromEmail(user?.email)
  const bindTooltip = useHoverTooltip()
  const { hideTooltip } = useContext(HoverTooltipContext)
  const location = useLocation()
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 860px)').matches,
  )
  // Guarda só as decisões explícitas do usuário (abrir/fechar via clique).
  // Sem override, um grupo fica aberto quando a rota ativa está dentro dele —
  // assim navegar pra outro grupo auto-expande ele sem precisar de efeito.
  const [openOverrides, setOpenOverrides] = useState({})

  function toggleGroup(key, currentlyOpen) {
    setOpenOverrides((prev) => ({ ...prev, [key]: !currentlyOpen }))
  }

  // No modo recolhido só cabe ícone, sem sub-menu — clicar num grupo expande
  // a sidebar de volta e já deixa o grupo aberto pra escolher o item. O botão
  // clicado desaparece nessa troca (vira o cabeçalho do acordeão) sem disparar
  // mouseleave, então o tooltip precisa ser fechado à mão pra não ficar
  // flutuando na tela.
  function openGroupExpanded(key) {
    hideTooltip()
    setOpenOverrides((prev) => ({ ...prev, [key]: true }))
    toggleSidebar()
  }

  // A barra vira uma faixa horizontal abaixo de 861px (ver Sidebar.module.css)
  // — nesse layout não há espaço pra acordeão, então usa a lista achatada
  // mesmo com a sidebar "expandida".
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 860px)')
    const handleChange = (event) => setIsMobile(event.matches)
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  return (
    <nav className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.top}>
        <img src={logo} alt="GMAD" className={styles.brandLogo} />
      </div>

      {!collapsed && <div className={styles.brandSub}>Madville | Curitiba</div>}

      {!collapsed && <div className={styles.navDivider} />}

      {!collapsed && <div className={styles.sectionLabel}>Navegação</div>}

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

              const { key, label, icon: Icon, items } = entry
              const active = isGroupActive(entry, location.pathname)
              const open = key in openOverrides ? openOverrides[key] : active

              if (collapsed) {
                return (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.navButton} ${active ? styles.active : ''}`}
                    onClick={() => openGroupExpanded(key)}
                    {...bindTooltip(label)}
                  >
                    <span className={styles.navIcon}>
                      <Icon />
                    </span>
                    <span className={styles.label}>{label}</span>
                  </button>
                )
              }

              return (
                <div key={key} className={styles.navGroup}>
                  <button
                    type="button"
                    className={`${styles.navButton} ${styles.groupHead} ${active ? styles.active : ''}`}
                    onClick={() => toggleGroup(key, open)}
                    aria-expanded={open}
                  >
                    <span className={styles.navIcon}>
                      <Icon />
                    </span>
                    <span className={styles.label}>{label}</span>
                    <span className={`${styles.chevron} ${open ? styles.chevronOpen : ''}`}>
                      <ChevronDownIcon />
                    </span>
                  </button>

                  {open && (
                    <div className={styles.groupBody}>
                      {items.map(({ to, label: itemLabel, icon: ItemIcon, truncates }) => (
                        <NavLink
                          key={to}
                          to={to}
                          className={({ isActive }) =>
                            `${styles.navButton} ${isActive ? styles.active : ''}`
                          }
                          {...(truncates ? bindTooltip(itemLabel) : {})}
                        >
                          <span className={styles.navIcon}>
                            <ItemIcon />
                          </span>
                          <span className={styles.label}>{itemLabel}</span>
                        </NavLink>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
      </div>

      {!collapsed && <div className={styles.greeting}>Olá, {displayName}</div>}
    </nav>
  )
}
