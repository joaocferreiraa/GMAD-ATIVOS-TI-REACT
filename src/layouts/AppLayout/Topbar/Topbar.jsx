import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useTheme } from '../../../hooks/theme/useTheme'
import { useNotifications } from '../../../hooks/useNotifications'
import { useNavigateTo } from '../../../hooks/useNavigateTo'
import { useClickOutside } from '../../../hooks/overlay/useClickOutside'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { initials, nameFromEmail } from '../../../utils/formatters'
import { assetStatusVariant } from '../../../utils/statusBadge'
import Badge from '../../../components/ui/Badge/Badge'
import CommandPalette from '../CommandPalette/CommandPalette'
// Mesma troca de logo por tema do painel de TV (ver TvPage): no escuro o
// verde da marca (#006934) fica com 2.84:1 sobre a barra — abaixo do mínimo
// de 3:1 pra elementos gráficos —, então entra a versão que clareia só o
// verde e mantém o laranja. No claro a logo normal é que se lê melhor.
import logoClara from '../../../assets/images/gmad-logo.png'
import logoEscura from '../../../assets/images/gmad-logo-dark.png'
import {
  MoonIcon,
  SunIcon,
  SearchIcon,
  BellIcon,
  LogoutIcon,
  LocationIcon,
} from '../../../components/ui/Icon/icons'
import styles from './Topbar.module.css'

// Sino de notificações: reaproveita os mesmos itens do "Requer atenção" do
// Dashboard (garantias vencendo + manutenção), com contador no ícone e
// painel suspenso ao clicar. Cada item já chega com `to: { route, state }`
// pronto (ver getAttentionItems/useNotifications) — a Topbar só navega,
// sem saber o que é cada tipo de notificação. Um tipo novo (ex: ficha de
// contato, item de estoque) só precisa montar seu próprio `to` na origem;
// se apontar para um ativo usa state.openUid (mesmo mecanismo do
// CommandPalette, lido em AtivosPage/ContatosPage), se for algo agrupado
// usa state.filters (lido em AtivosPage) ou nenhum state.
function NotificationsButton() {
  const navigateTo = useNavigateTo()
  const items = useNotifications()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const bindTooltip = useHoverTooltip()

  function close() {
    setOpen(false)
  }

  useClickOutside(rootRef, open, close)
  useEscapeKey(open, close)

  return (
    <div ref={rootRef} className={styles.notifRoot}>
      <button
        type="button"
        className={`${styles.iconBtn} ${styles.iconBtnAccent} ${styles.notifBtn}`}
        onClick={() => setOpen((current) => !current)}
        aria-label="Notificações"
        aria-haspopup="menu"
        aria-expanded={open}
        {...bindTooltip('Notificações')}
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
                    if (item.to) navigateTo(item.to)
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
  const logo = isDark ? logoEscura : logoClara
  const [paletteOpen, setPaletteOpen] = useState(false)
  const bindTooltip = useHoverTooltip()

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
          <div className={styles.brand}>
            <img src={logo} alt="GMAD" className={styles.brandLogo} />
            <span className={styles.brandDivider} />
            <span className={styles.brandLabel}>Painel de TI</span>
            {/* Some primeiro no celular (ver media query) — "Painel de TI" +
                logo já bastam pra marca ali, e a barra some de largura sobra
                pra pouca coisa nas telas estreitas. */}
            <span className={styles.brandUnitGroup}>
              <span className={styles.brandDivider} />
              <span className={styles.brandUnit}>
                <LocationIcon width={16} height={16} />
                Madville | Curitiba
              </span>
            </span>
          </div>
          <div className={styles.navRight}>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnAccent}`}
              onClick={toggleTheme}
              aria-label="Alternar tema"
              {...bindTooltip('Alternar tema')}
            >
              {isDark ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
            </button>
            <button
              type="button"
              className={styles.search}
              onClick={() => setPaletteOpen(true)}
              {...bindTooltip('Buscar (Ctrl+K)')}
            >
              <SearchIcon width={14} height={14} />
              <span className={styles.searchPlaceholder}>Buscar</span>
            </button>
            <NotificationsButton />
            <div className={styles.navDivider} />
            <div className={styles.userChip}>
              <div className={styles.avatar}>{initials(displayName)}</div>
              <span>{displayName}</span>
            </div>
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnAccent}`}
              onClick={() => signOut()}
              aria-label="Sair"
              {...bindTooltip('Sair')}
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
