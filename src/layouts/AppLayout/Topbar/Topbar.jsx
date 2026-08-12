import { useAuth } from '../../../hooks/auth/useAuth'
import { useTheme } from '../../../hooks/theme/useTheme'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { useSyncStatus } from '../../../hooks/useSyncStatus'
import { initials, nameFromEmail, relativeSyncTime } from '../../../utils/formatters'
import {
  PanelIcon,
  MoonIcon,
  SunIcon,
  SearchIcon,
  BellIcon,
  LogoutIcon,
} from '../../../components/ui/Icon/icons'
import styles from './Topbar.module.css'

const SYNC_LABEL = {
  syncing: 'Sincronizando...',
  offline: 'Sem conexão',
  connected: 'Sincronizado',
}

// Indicador de sincronização (equivalente ao #syncIndicator original):
// 'syncing' enquanto uma chamada ao Supabase está em andamento (ver
// kvStore.js), 'connected'/'offline' depois, com a hora da última
// sincronização bem-sucedida no tooltip.
function SyncIndicator() {
  const { status, lastSync } = useSyncStatus()

  return (
    <div
      className={`${styles.syncIndicator} ${status !== 'connected' ? styles[status] : ''}`}
      tabIndex={0}
    >
      <span className={styles.siDot} />
      <span>{SYNC_LABEL[status]}</span>
      <div className={styles.syncTooltip}>
        <span className={styles.stTitle}>Status da sincronização</span>
        {status === 'syncing' && <div className={styles.stLine}>Sincronizando dados...</div>}
        {status === 'offline' && (
          <>
            <div className={styles.stLine}>Não foi possível comunicar com o banco de dados.</div>
            <div className={styles.stLine}>Verifique sua conexão.</div>
          </>
        )}
        {status === 'connected' && (
          <>
            <div className={styles.stRow}>
              <span>Banco de dados:</span>
              <b>Conectado</b>
            </div>
            <div className={styles.stRow}>
              <span>Última sincronização:</span>
              <b>{relativeSyncTime(lastSync)}</b>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Topbar() {
  const { user, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { collapsed, toggleSidebar } = useSidebarState()

  const displayName = nameFromEmail(user?.email)

  return (
    <div className={styles.heroNav}>
      <div className={styles.heroNavInner}>
        <div className={styles.topbar}>
          <div className={styles.left}>
            <button
              type="button"
              className={styles.panelBtn}
              onClick={toggleSidebar}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!collapsed}
            >
              <PanelIcon width={16} height={16} />
            </button>
          </div>
          <div className={styles.navRight}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleTheme}
              title="Alternar tema"
              aria-label="Alternar tema"
            >
              {isDark ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
            </button>
            <div className={styles.search} title="Busca em breve">
              <SearchIcon width={14} height={14} />
              <span className={styles.searchPlaceholder}>Buscar</span>
              <kbd className={styles.searchKbd}>⌘K</kbd>
            </div>
            <SyncIndicator />
            <button
              type="button"
              className={styles.iconBtn}
              title="Notificações"
              aria-label="Notificações"
            >
              <BellIcon width={16} height={16} />
            </button>
            <div className={styles.userChip}>
              <div className={styles.avatar}>{initials(displayName)}</div>
              <span>{displayName}</span>
            </div>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={() => signOut()}
              title="Sair"
              aria-label="Sair"
            >
              <LogoutIcon width={16} height={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
