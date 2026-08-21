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

// Atraso do flyout (ver o efeito lá embaixo). Só o FECHAR tem um.
//
// Abrir é imediato em todo caso: o painel aparece assim que o cursor chega no
// módulo, na primeira vez igual às seguintes. Havia aqui um hover-intent de
// 180ms, mas ele só pegava a PRIMEIRA abertura — trocar de um grupo aberto
// pro vizinho sempre foi imediato —, e a diferença entre os dois casos era
// visível em uso: a barra parecia travar ao abrir o primeiro menu e responder
// na hora em todos os outros. Uniformizar por cima (esperar sempre) tornaria
// lenta justamente a navegação entre módulos, então uniformiza por baixo.
//
// O que se paga por isso: atravessar a barra na diagonal pra chegar no
// conteúdo abre o painel de cada módulo do caminho. O atraso de fechar segura
// o estrago — o painel não some a cada pixel, então o que se vê é um painel
// acompanhando o cursor, não uma sequência de piscadas.
//
// Fechar continua esperando: entre o botão e o painel há um vão de 8px onde o
// cursor não está sobre nenhum dos dois, e fechar ali cortaria o caminho
// até os itens.
const HOVER_FECHAR_MS = 220

// Espelha o `transition: width 0.28s` de .sidebar (Sidebar.module.css) —
// mantenha os dois em sincronia.
//
// No modo "expandir ao passar o mouse" a barra alarga de 48px pra 212px ao
// receber o cursor, e o painel do módulo se ancora na BORDA DIREITA dela. Sem
// esperar, o painel nasce colado na barra estreita e é arrastado pra direita
// enquanto ela cresce — a expansão da barra, que é o movimento principal,
// vira pano de fundo de um painel que aparece antes dela terminar.
//
// A espera vale só ENQUANTO a barra está alargando, e é o resto do tempo que
// falta pra ela chegar ao fim (ver `restanteDaExpansao`) — não um atraso
// fixo. Nos outros dois modos a barra não muda de largura e não há o que
// esperar; e com a barra já aberta, passar de um módulo pro vizinho continua
// abrindo na hora. É o que separa este caso do hover-intent que saiu daqui:
// aquele atrasava a PRIMEIRA abertura sempre, mesmo sem nada se movendo.
const PEEK_EXPANSAO_MS = 280

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

  // Abre sem alternar: como o hover (ver efeito abaixo) já deixa o painel
  // aberto quando o cursor chega no botão, um clique que fechasse só faria
  // o painel piscar — o mousemove seguinte, com o cursor ainda em cima,
  // reabriria na hora. Fechar é por Esc, clique fora ou sair com o mouse.
  // Pelo teclado (Tab + Enter) não há hover, e este mesmo handler abre.
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
  // Fechar espera HOVER_FECHAR_MS: entre o botão e o painel há um vão de 8px
  // (ver o `left` em SidebarGroupFlyout) onde o cursor não está sobre nenhum
  // dos dois, e fechar ali cortaria o caminho até os itens.
  //
  // Abrir só espera enquanto a barra estiver alargando, e só no modo hover —
  // ver PEEK_EXPANSAO_MS lá em cima. Com a barra parada (qualquer modo), abre
  // na hora.
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
    // Instante em que o cursor entrou na barra; 0 enquanto está fora dela.
    // Medido aqui dentro, e não num efeito sobre `peek`, porque o mousemove
    // que dispara a expansão é o MESMO que já pode cair sobre um módulo (quem
    // entra na barra entra por cima de algum): um efeito só rodaria no render
    // seguinte, e justamente a primeira leitura — a que importa — sairia
    // zerada, abrindo o painel na hora.
    let entrouEm = 0

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

    // Quanto ainda falta da expansão da barra. Zero fora do modo hover (lá a
    // largura é fixa) e zero assim que a transição termina — a partir daí
    // trocar de módulo volta a abrir na hora.
    function restanteDaExpansao() {
      if (mode !== 'hover' || !entrouEm) return 0
      return Math.max(0, PEEK_EXPANSAO_MS - (performance.now() - entrouEm))
    }

    function handleMouseMove(event) {
      // Sair da barra rearma a espera: voltar depois é uma expansão nova, já
      // que a largura volta ao estreito assim que o cursor sai.
      const naBarra = Boolean(event.target.closest('[data-sidebar-hover-zone]'))
      if (!naBarra) entrouEm = 0
      else if (!entrouEm) entrouEm = performance.now()

      const botao = event.target.closest('[data-sidebar-group]')
      if (botao) {
        const { sidebarGroup: key } = botao.dataset
        // Cancelar o timer vale pros dois casos: se o painel deste módulo já
        // está aberto, o cursor voltou e não deve mais fechar; se vai abrir
        // outro, o fechamento pendente perdeu o sentido.
        limparTimer()
        // Sem distinguir "primeira abertura" de "troca de módulo" — era essa
        // assimetria que fazia uma parecer mais lenta que a outra. O que
        // atrasa aqui é só a barra ainda estar alargando, e cada mousemove
        // reagenda com o que sobrou: mexer o mouse sobre o botão não empurra
        // a abertura pra frente, ela cai sempre no fim da expansão.
        if (flyoutAtualRef.current?.key !== key) {
          const espera = restanteDaExpansao()
          if (espera) agendar(() => abrir(key, botao), espera)
          else abrir(key, botao)
        }
        return
      }
      // Sobre o painel aberto: segura. Fora de tudo: agenda o fechamento se
      // havia algo aberto. O último ramo é só faxina — sem nada aberto não há
      // fechamento pendente pra cancelar, exceto se a rota tiver trocado com
      // um timer no ar (o flyout já é zerado no render nesse caso).
      if (event.target.closest('[data-sidebar-flyout]')) limparTimer()
      else if (flyoutAtualRef.current) agendar(() => setFlyout(null), HOVER_FECHAR_MS)
      else limparTimer()
    }

    document.addEventListener('mousemove', handleMouseMove)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      limparTimer()
    }
    // `mode` entra nas deps por causa de restanteDaExpansao: só o modo hover
    // alarga a barra. Trocar de modo é raro (é um clique no rodapé da barra),
    // então religar o listener aqui não custa nada.
  }, [isMobile, hideTooltip, mode])

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
                  {...(!flyoutOpen && (collapsed || entry.truncates) ? bindTooltipFoco(label) : {})}
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

      {/* key no grupo: passar o mouse de um módulo pro vizinho troca só as
          props, e uma animação CSS não reexecuta sem remontar — o painel
          teleportava e trocava o conteúdo de uma vez. Com a key ele refaz a
          entrada a cada módulo, que é justamente o gesto que a abertura
          imediata (sem espera nenhuma) torna comum aqui. */}
      {flyoutGroup && (
        <SidebarGroupFlyout
          key={flyoutGroup.key}
          group={flyoutGroup}
          anchorEl={flyout.anchorEl}
          onClose={closeFlyout}
        />
      )}
    </nav>
  )
}
