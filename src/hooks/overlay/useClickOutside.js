import { useEffect } from 'react'

// Chama onOutside quando um clique/toque acontece fora de `ref.current`,
// enquanto `active` for true. Usado por Select, Dropdown, KpiStrip,
// SidebarModeMenu e pelos dois menus da Topbar (notificações e conta).
//
// `pointerdown`, e não `mousedown`: no iOS o mousedown só é sintetizado em
// elementos que o Safari considera clicáveis, então tocar numa área "morta"
// da página não fechava menu nenhum — eles ficavam abertos até acertar um
// botão. pointerdown cobre mouse, toque e caneta com um listener só.
//
// Continua disparando ANTES do click, que é o que importa pros consumidores:
// fechar no pointerdown e deixar o click seguinte cair no elemento de baixo é
// o mesmo comportamento de antes, agora também no toque.
//
// NÃO cobre o SidebarGroupFlyout: ele tem handler próprio (o painel é portado
// pro body, longe do botão que o abriu, e um único ref não envolve os dois).
// Aquele é só desktop — no mobile os grupos abrem em segunda linha, sem
// flyout —, então segue no mousedown sem prejuízo.
export function useClickOutside(ref, active, onOutside) {
  useEffect(() => {
    if (!active) return undefined

    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onOutside()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [ref, active, onOutside])
}
