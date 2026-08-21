import { Fragment, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation } from 'react-router-dom'
import { ROUTES } from '../../../constants/routes'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useTheme } from '../../../hooks/theme/useTheme'
import { useNotifications } from '../../../hooks/useNotifications'
import { useNavigateTo } from '../../../hooks/useNavigateTo'
import { useClickOutside } from '../../../hooks/overlay/useClickOutside'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { nameFromEmail } from '../../../utils/formatters'
import { assetStatusVariant } from '../../../utils/statusBadge'
import Badge from '../../../components/ui/Badge/Badge'
import ConfirmDialog from '../../../components/ui/ConfirmDialog/ConfirmDialog'
import ChangePasswordModal from './ChangePasswordModal'
import NewsModal from './NewsModal'
import ProfileModal from './ProfileModal'
import SyncStatusRow from './SyncStatusRow'
import Loading from '../../../components/ui/Loading/Loading'
import CommandPalette from '../CommandPalette/CommandPalette'
import { breadcrumbTrail } from './breadcrumbTrail'
import { useNovidades } from '../../../hooks/useNovidades'
import { usePerfil } from '../../../hooks/data/usePerfil'
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
  KeyIcon,
  AvatarSilhuetaIcon,
  SparkIcon,
  UserIcon,
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

// Foto de perfil quando existe, silhueta quando não.
//
// Os dois PREENCHEM o círculo, em vez de um desenho pequeno centrado dentro
// dele. A silhueta anterior era o UserIcon de contorno em 15px num círculo de
// 26px: ficava matematicamente centrada e mesmo assim lia como torta, porque
// o busto de traço tem cabeça pequena, vão no meio e corte reto embaixo — nada
// disso acompanha uma borda redonda. Agora o círculo recorta a silhueta como
// recortaria uma foto (ver AvatarSilhuetaIcon e o overflow em .avatarIcone).
//
// A <img> usa object-fit: cover — a foto já chega quadrada de utils/imagem.js,
// então o cover só cobre o caso de uma foto antiga em outra proporção, sem
// deformar rosto nenhum.
function Avatar({ foto, nome, className = '' }) {
  if (foto) {
    return <img src={foto} alt={`Foto de ${nome}`} className={`${styles.avatarFoto} ${className}`} />
  }
  return (
    <span className={`${styles.avatarIcone} ${className}`}>
      <AvatarSilhuetaIcon className={styles.avatarSilhueta} />
    </span>
  )
}

// Avatar + menu da conta. Três coisas mudaram junto aqui, e cada uma
// resolve um problema diferente:
//
// 1. O nome saiu da barra e mora no menu. Ele não era interativo nem mudava
//    — informação estática ocupando o lugar mais nobre da barra.
// 2. "Sair" saiu de um botão solto encostado no chip. Um painel que fica
//    aberto o dia todo não deve ter deslogar a um clique de distância do
//    nome do usuário.
// 3. E ainda assim pede confirmação: o menu só adiciona atrito, não
//    protege de um clique decidido no item errado. `signOut()` derruba a
//    sessão sem volta.
//
// O tooltip fica preso ao avatar sem a trava de `!open` que o
// SidebarModeMenu usa — aqui ele é ligado sempre, como no
// NotificationsButton logo acima, então o mouseleave nunca some junto com o
// binding. E ele mostra justamente o nome que saiu da barra: dá pra ler a
// conta sem abrir o menu.
function UserMenu() {
  const { user, signOut } = useAuth()
  const displayName = nameFromEmail(user?.email)
  const perfil = usePerfil()
  const [open, setOpen] = useState(false)
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const [trocandoSenha, setTrocandoSenha] = useState(false)
  const [vendoNovidades, setVendoNovidades] = useState(false)
  const [editandoPerfil, setEditandoPerfil] = useState(false)
  const { temNovidade, marcarComoLidas } = useNovidades()
  const [saindo, setSaindo] = useState(false)
  const rootRef = useRef(null)
  const bindTooltip = useHoverTooltip()

  // Confirmar não desloga na hora: primeiro sobe o véu, e só depois a sessão
  // cai. `signOut()` troca a rota imediatamente, então sem esta espera o véu
  // apareceria e seria desmontado no mesmo quadro — o usuário veria um
  // piscar, não uma saída.
  //
  // 420ms é a duração do fade do véu (ver .saindoVeu): a sessão cai quando a
  // tela já está coberta, e a troca pro login acontece atrás dele.
  useEffect(() => {
    if (!saindo) return undefined
    const id = setTimeout(() => signOut(), 420)
    return () => clearTimeout(id)
  }, [saindo, signOut])

  function close() {
    setOpen(false)
  }

  useClickOutside(rootRef, open, close)
  useEscapeKey(open, close)

  return (
    <div ref={rootRef} className={styles.userRoot}>
      <button
        type="button"
        className={`${styles.avatarBtn} ${open ? styles.avatarBtnOpen : ''}`}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Conta de ${displayName}`}
        aria-haspopup="menu"
        aria-expanded={open}
        {...bindTooltip(displayName)}
      >
        <Avatar foto={perfil.foto} nome={displayName} />
      </button>

      {open && (
        <div className={styles.userPanel} role="menu">
          <div className={styles.userHeader}>
            <Avatar foto={perfil.foto} nome={displayName} className={styles.avatar} />
            <span className={styles.userIdent}>
              <b>{displayName}</b>
              {/* Setor e cargo só ocupam linha quando existem: em branco,
                  deixariam um vazio entre o nome e o e-mail. */}
              {/* Setor antes do cargo: vai do mais amplo pro mais específico,
                  como o resto do painel lê da esquerda pra direita. */}
              {(perfil.setor || perfil.cargo) && (
                <span className={styles.userCargo}>
                  {[perfil.setor, perfil.cargo].filter(Boolean).join(' · ')}
                </span>
              )}
              {/* O e-mail é a única coisa aqui que identifica a conta de
                  verdade — o nome é derivado dele (ver nameFromEmail), então
                  dois logins parecidos dariam o mesmo nome. */}
              <span className={styles.userEmail}>{user?.email}</span>
            </span>
          </div>
          {/* Estado da sincronização antes das ações: é informação, não
              comando, e quem abre o menu costuma querer saber se o painel
              está com dado fresco antes de decidir qualquer coisa. */}
          <SyncStatusRow />
          <div className={styles.userSep} />
          <button
            type="button"
            role="menuitem"
            className={styles.userAction}
            onClick={() => {
              close()
              setEditandoPerfil(true)
            }}
          >
            <UserIcon width={16} height={16} />
            Meu perfil
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.userAction}
            onClick={() => {
              close()
              setTrocandoSenha(true)
            }}
          >
            <KeyIcon width={16} height={16} />
            Trocar senha
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.userAction}
            onClick={() => {
              close()
              setVendoNovidades(true)
              // Marca como lidas ao ABRIR, não ao fechar: quem abriu já viu o
              // que havia, e exigir que feche pelo botão certo faria o aviso
              // voltar em quem saiu com Esc ou clique fora.
              marcarComoLidas()
            }}
          >
            <SparkIcon width={16} height={16} />
            Novidades
            {temNovidade && <span className={styles.pontoNovidade} aria-label="não lidas" />}
          </button>
          {/* Linha antes de "Sair": ele é o único item destrutivo do menu, e
              separá-lo evita o clique por inércia logo abaixo do anterior. */}
          <div className={styles.userSep} />
          <button
            type="button"
            role="menuitem"
            className={`${styles.userAction} ${styles.userActionDanger}`}
            onClick={() => {
              close()
              setConfirmandoSaida(true)
            }}
          >
            <LogoutIcon width={16} height={16} />
            Sair
          </button>
        </div>
      )}

      <ChangePasswordModal open={trocandoSenha} onClose={() => setTrocandoSenha(false)} />

      <NewsModal open={vendoNovidades} onClose={() => setVendoNovidades(false)} />

      {editandoPerfil && <ProfileModal open onClose={() => setEditandoPerfil(false)} />}

      <ConfirmDialog
        open={confirmandoSaida}
        title="Sair da conta?"
        message="Você vai precisar entrar de novo para voltar ao painel."
        confirmLabel="Sair"
        onConfirm={() => {
          setConfirmandoSaida(false)
          setSaindo(true)
        }}
        onCancel={() => setConfirmandoSaida(false)}
      />

      {/* Véu de saída, portado pro body: precisa cobrir a barra, a lateral e
          o conteúdo, e daqui de dentro do .navRight ele ficaria preso na
          fileira de ícones. Cobre a troca de rota pro login, que sem ele é um
          corte seco de uma tela cheia pra outra. */}
      {saindo &&
        createPortal(
          <div className={styles.saindoVeu}>
            <Loading size="lg" label="Saindo…" />
          </div>,
          document.body,
        )}
    </div>
  )
}

export default function Topbar() {
  const { isDark, toggleTheme } = useTheme()
  const logo = isDark ? logoEscura : logoClara
  // Só o primeiro nível da trilha: o MÓDULO ("Chamados"), sem a sub-aba
  // ("Indicadores") logo depois. A barra fica com um segmento por vez, no
  // lugar de uma fileira que só crescia à direita.
  //
  // O que isso custa: dentro de um módulo a barra não distingue mais uma
  // sub-aba da outra — Central de Chamados e Indicadores mostram as duas
  // "Chamados". Quem diz qual das duas está aberta é o <h1> da página.
  //
  // O Painel geral é o único link solto do menu — não pertence a módulo
  // nenhum, então não tem primeiro nível pra mostrar. Aparece como "Início",
  // e não como "Painel geral": o nome longo do menu, emendado logo depois da
  // marca, lia como um segundo título; "Início" diz a mesma coisa e assume
  // que ali é o ponto de partida, que é o papel da rota raiz.
  //
  // Rota fora do menu (a lista de máquinas detectadas) segue sem trilha —
  // breadcrumbTrail devolve [] e o slice mantém vazio.
  const { pathname } = useLocation()
  const trilha =
    pathname === ROUTES.dashboard ? ['Início'] : breadcrumbTrail(pathname).slice(0, 1)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const bindTooltip = useHoverTooltip()

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
            {/* A marca leva pro Painel geral — o atalho que todo painel tem
                no logo do canto.
                <Link>, e NUNCA <a href>: no app instalado (display:
                standalone) um href dispara navegação de documento, o que
                recarrega a aplicação inteira e descarta o cache do
                React Query. O Link navega no cliente, sem recarga, dentro
                do mesmo histórico do app.
                O rótulo acessível vive aqui e não no alt da imagem: quem usa
                leitor de tela precisa saber PRA ONDE o link vai, não só que
                existe uma logo. Ele NÃO vira tooltip: o aria-label é lido
                por leitor de tela, e a marca no canto já é um atalho
                conhecido o bastante pra dispensar legenda na tela. */}
            <Link
              to={ROUTES.dashboard}
              className={styles.brandHome}
              aria-label="GMAD — ir para o Painel geral"
            >
              <img src={logo} alt="GMAD" className={styles.brandLogo} />
            </Link>
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
            {/* Trilha da rota, continuando a mesma linha da marca. Rota fora
                do menu devolve [] e não desenha nada — nem os separadores,
                que sobrariam soltos no fim da marca. */}
            {trilha.length > 0 && (
              <nav className={styles.brandTrail} aria-label="Trilha de navegação">
                {trilha.map((rotulo) => (
                  <Fragment key={rotulo}>
                    <span className={styles.brandDivider} aria-hidden="true" />
                    <span className={styles.crumb}>{rotulo}</span>
                  </Fragment>
                ))}
              </nav>
            )}
          </div>
          <div className={styles.navRight}>
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
            {/* Ao lado do sino, e não abrindo a fileira: os dois são botões
                redondos do mesmo tamanho, então ficam como um par depois da
                pílula da busca, em vez de um solto na ponta esquerda. */}
            <button
              type="button"
              className={`${styles.iconBtn} ${styles.iconBtnAccent}`}
              onClick={toggleTheme}
              aria-label="Alternar tema"
              {...bindTooltip('Alternar tema')}
            >
              {isDark ? <SunIcon width={16} height={16} /> : <MoonIcon width={16} height={16} />}
            </button>
            <UserMenu />
          </div>
        </div>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}
