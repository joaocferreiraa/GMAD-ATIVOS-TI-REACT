import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink } from 'react-router-dom'
import { useEscapeKey } from '../../../hooks/overlay/useEscapeKey'
import styles from './SidebarGroupFlyout.module.css'

// Painel que abre ao lado de um grupo da barra recolhida (equivalente ao
// painel do Table Editor no Supabase): clicar num ícone de grupo não expande
// mais a barra inteira, só revela os itens daquele grupo aqui — a barra
// continua estreita. Portal pro body porque `.nav` tem overflow-x: hidden
// (ver Sidebar.module.css) e cortaria um painel posicionado dentro dela.
//
// data-sidebar-hover-zone marca este painel pro listener de mousemove da
// Sidebar (ver Sidebar.jsx): mesmo portado pro body, longe da <nav> no DOM,
// o cursor sobre este painel também deve contar como "sobre a barra" no modo
// "expandir ao passar o mouse" — senão a barra fecharia por baixo do painel
// ainda aberto assim que o mouse saísse do ícone que o abriu.
//
// data-sidebar-flyout marca só ESTE painel (data-sidebar-hover-zone também
// está na <nav> inteira): o hover que abre os grupos precisa distinguir
// "cursor sobre o painel aberto" — que o mantém — de "cursor sobre a barra,
// fora de qualquer grupo" — que o fecha.
export default function SidebarGroupFlyout({ group, anchorEl, onClose }) {
  const panelRef = useRef(null)
  const [position, setPosition] = useState(null)

  useLayoutEffect(() => {
    if (!anchorEl) return
    const rect = anchorEl.getBoundingClientRect()
    const panelHeight = panelRef.current?.offsetHeight ?? 0
    const maxTop = window.innerHeight - panelHeight - 12
    const top = Math.min(rect.top, Math.max(12, maxTop))
    setPosition({ top, left: rect.right + 8 })
  }, [anchorEl, group])

  // Fecha ao clicar fora — não dá pra usar o useClickOutside compartilhado
  // aqui: ele espera um único ref envolvendo gatilho+painel, mas o painel é
  // portado pro body, longe do botão que o abriu no <nav>. Sem checar
  // `anchorEl` também, um clique num item DESTE painel conta como "fora" (o
  // painel não é descendente dele) e o mousedown fecha o componente antes do
  // click subsequente do NavLink conseguir navegar.
  useEffect(() => {
    function handlePointerDown(event) {
      if (panelRef.current?.contains(event.target)) return
      if (anchorEl?.contains(event.target)) return
      onClose()
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [anchorEl, onClose])

  useEscapeKey(true, onClose)

  if (!group) return null

  const GroupIcon = group.icon

  return createPortal(
    <div
      ref={panelRef}
      data-sidebar-hover-zone=""
      data-sidebar-flyout=""
      className={styles.flyout}
      style={position ? { top: position.top, left: position.left } : { visibility: 'hidden' }}
      role="menu"
    >
      <div className={styles.header}>
        <GroupIcon />
        <span>{group.label}</span>
      </div>
      <div className={styles.list}>
        {group.items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) => `${styles.item} ${isActive ? styles.active : ''}`}
            onClick={onClose}
          >
            <span className={styles.itemIcon}>
              <Icon />
            </span>
            {label}
          </NavLink>
        ))}
      </div>
    </div>,
    document.body,
  )
}
