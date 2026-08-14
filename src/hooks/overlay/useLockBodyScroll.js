import { useEffect } from 'react'

// Trava o scroll do body enquanto `active` for true. Só overflow:hidden não
// basta no iOS Safari — o body ainda "vaza" scroll/rubber-banding por trás
// do overlay fixed — então também fixamos a posição e compensamos com
// top negativo, restaurando a posição de leitura exata ao fechar.
export function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return undefined

    const scrollY = window.scrollY
    const { body } = document
    const previous = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    }

    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.width = '100%'

    return () => {
      body.style.overflow = previous.overflow
      body.style.position = previous.position
      body.style.top = previous.top
      body.style.width = previous.width
      window.scrollTo(0, scrollY)
    }
  }, [active])
}
