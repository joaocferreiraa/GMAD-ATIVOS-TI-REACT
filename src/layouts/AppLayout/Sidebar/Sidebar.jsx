import { NavLink } from 'react-router-dom'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { NAV_ITEMS } from './navItems'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const { collapsed } = useSidebarState()

  return (
    <nav className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            title={label}
            className={({ isActive }) => `${styles.navButton} ${isActive ? styles.active : ''}`}
          >
            <span className={styles.navIcon}>
              <Icon />
            </span>
            <span className={styles.label}>{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
