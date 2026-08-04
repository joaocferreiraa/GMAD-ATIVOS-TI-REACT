import { useAuth } from '../../../hooks/auth/useAuth'
import { useTheme } from '../../../hooks/theme/useTheme'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { initials, nameFromEmail } from '../../../utils/formatters'
import { MenuIcon, MoonIcon, SunIcon } from '../../../components/ui/Icon/icons'
import styles from './Topbar.module.css'

// Indicador de sincronização: sem uma camada de dados migrada ainda, reflete
// apenas se o Supabase está configurado (conectado/sem conexão). O estado
// "sincronizando" e o horário da última sincronização voltam junto com a
// migração das telas que de fato leem/gravam dados.
function SyncIndicator({ connected }) {
  return (
    <div className={`${styles.syncIndicator} ${connected ? '' : styles.offline}`} tabIndex={0}>
      <span className={styles.siDot} />
      <span>{connected ? 'Sincronizado' : 'Sem conexão'}</span>
      <div className={styles.syncTooltip}>
        <span className={styles.stTitle}>Status da sincronização</span>
        {connected ? (
          <div className={styles.stRow}>
            <span>Banco de dados:</span>
            <b>Conectado</b>
          </div>
        ) : (
          <>
            <div className={styles.stLine}>Não foi possível comunicar com o banco de dados.</div>
            <div className={styles.stLine}>Verifique sua conexão.</div>
          </>
        )}
      </div>
    </div>
  )
}

export default function Topbar() {
  const { user, isSupabaseConfigured, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { collapsed, toggleSidebar } = useSidebarState()

  const displayName = nameFromEmail(user?.email)

  return (
    <div className={styles.heroNav}>
      <div className={styles.heroNavInner}>
        <div className={styles.topbar}>
          <div className={styles.brand}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleSidebar}
              title={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              aria-expanded={!collapsed}
            >
              <MenuIcon width={16} height={16} />
            </button>
            <div className={styles.brandMark}>
              GM<span className={styles.bmA}>A</span>D
            </div>
            <div className={styles.brandUnits}>
              <span className={styles.buName}>Madville</span>
              <span className={styles.buSep}>|</span>
              <span className={styles.buName}>Curitiba</span>
            </div>
          </div>
          <div className={styles.navRight}>
            <button
              type="button"
              className={styles.iconBtn}
              onClick={toggleTheme}
              title="Alternar tema"
            >
              {isDark ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
            </button>
            <SyncIndicator connected={isSupabaseConfigured} />
            <div className={styles.userChip}>
              <div className={styles.avatar}>{initials(displayName)}</div>
              <span>{displayName}</span>
            </div>
            <button type="button" className={styles.btnLogout} onClick={() => signOut()}>
              Sair
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
