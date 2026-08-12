import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useTheme } from '../../../hooks/theme/useTheme'
import { useSidebarState } from '../../../hooks/layout/useSidebarState'
import { useSyncStatus } from '../../../hooks/useSyncStatus'
import { useNotifications } from '../../../hooks/useNotifications'
import { useClickOutside } from '../../../hooks/overlay/useClickOutside'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import { initials, nameFromEmail, relativeSyncTime } from '../../../utils/formatters'
import { assetStatusVariant } from '../../../utils/statusBadge'
import { ROUTES } from '../../../constants/routes'
import Badge from '../../../components/ui/Badge/Badge'
import CommandPalette from '../CommandPalette/CommandPalette'
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

// Sino de notificações: reaproveita os mesmos itens do "Requer atenção" do
// Dashboard (garantias vencendo + manutenção), com contador no ícone e
// painel suspenso ao clicar. Clicar num item leva direto para Ativos.
function NotificationsButton() {
  const navigate = useNavigate()
  const items = useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  function close() {
    setOpen(false)
  }

  useClickOutside(rootRef, open, close)
  useEscapeKey(open, close)

  return (
    <div ref={rootRef} className={styles.notifRoot}>
      <button
        type="button"
        className={styles.iconBtn}
        onClick={() => setOpen((current) => !current)}
        title="Notificações"
        aria-label="Notificações"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <BellIcon width={16} height={16} />
        {items.length > 0 && (
          <span className={styles.notifBadge}>{items.length > 9 ? '9+' : items.length}</span>
        )}
      </button>

      {open && (
        <div className={styles.notifPanel} role="menu">
          <div className={styles.notifHeader}>Notificações</div>
          {items.length === 0 ? (
            <div className={styles.notifEmpty}>
              <BellIcon width={22} height={22} />
              <b>Nenhuma notificação</b>
              <span>Você será notificado sobre atualizações</span>
            </div>
          ) : (
            <div className={styles.notifList}>
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  className={styles.notifItem}
                  onClick={() => {
                    close()
                    navigate(ROUTES.ativos)
                  }}
                >
                  <div className={styles.notifMain}>
                    <b>{item.title}</b>
                    <span>{item.subtitle}</span>
                  </div>
                  {item.status && (
                    <Badge variant={assetStatusVariant(item.status)}>{item.status}</Badge>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function Topbar() {
  const { user, signOut } = useAuth()
  const { isDark, toggleTheme } = useTheme()
  const { collapsed, toggleSidebar } = useSidebarState()
  const [paletteOpen, setPaletteOpen] = useState(false)

  const displayName = nameFromEmail(user?.email)

  useEffect(() => {
    function handleKeyDown(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setPaletteOpen(true)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

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
            <button
              type="button"
              className={styles.search}
              onClick={() => setPaletteOpen(true)}
              title="Buscar (Ctrl+K)"
            >
              <SearchIcon width={14} height={14} />
              <span className={styles.searchPlaceholder}>Buscar</span>
            </button>
            <SyncIndicator />
            <NotificationsButton />
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

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
