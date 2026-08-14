import { NavLink } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { nameFromEmail } from '../../../utils/formatters'
import logo from '../../../assets/images/gmad-logo.png'
import { NAV_ITEMS } from './navItems'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { collapsed } = useSidebarState()
  const { user } = useAuth()
  const displayName = nameFromEmail(user?.email)
  const bindTooltip = useHoverTooltip()

  return (
    <nav className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.top}>
        <img src={logo} alt="GMAD" className={styles.brandLogo} />
      </div>

      {!collapsed && <div className={styles.brandSub}>Madville | Curitiba</div>}

      {!collapsed && <div className={styles.navDivider} />}

      {!collapsed && <div className={styles.sectionLabel}>Navegação</div>}

      <div className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `${styles.navButton} ${isActive ? styles.active : ''}`}
            {...bindTooltip(label)}
          >
            <span className={styles.navIcon}>
              <Icon />
            </span>
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}
      </div>

      {!collapsed && <div className={styles.greeting}>Olá, {displayName}</div>}
    </nav>
  )
}
