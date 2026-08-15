import { useState } from 'react'

const DISMISSED_KEY = 'gmad_pwa_ios_hint_dismissed'

function isIos() {
  const ua = window.navigator.userAgent
  const isIphoneIpad = /iPad|iPhone|iPod/.test(ua)
  // iPadOS 13+ se identifica como "Macintosh" (modo desktop), mas só um Mac
  // de verdade não tem suporte a multitoque — é o jeito padrão de distinguir.
  const isIpadOS13 = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1
  return isIphoneIpad || isIpadOS13
}

function isSafariBrowser() {
  const ua = window.navigator.userAgent
  // Chrome/Firefox/Edge no iOS rodam sobre WebKit mas se identificam como
  // CriOS/FxiOS/EdgiOS — só o Safari de verdade bate nessa checagem, e é
  // só nele que o botão Compartilhar tem "Adicionar à Tela de Início".
  return /^((?!chrome|crios|fxios|edgios|android).)*safari/i.test(ua)
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
  )
}

// Safari no iOS nunca dispara beforeinstallprompt (ver useInstallPrompt.js)
// — não tem como detectar "instalável" nem abrir o fluxo programaticamente.
// O único aviso possível é a instrução manual (Compartilhar → Adicionar à
// Tela de Início), mostrada só quando faz sentido: iOS, Safari de verdade
// (não outro navegador iOS), ainda não instalado, e o usuário não dispensou
// antes.
export function useIosInstallHint() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISSED_KEY) === '1')

  function dismiss() {
    setDismissed(true)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      // localStorage indisponível — o aviso só volta a aparecer nesta sessão.
    }
  }

  return {
    canShowHint: isIos() && isSafariBrowser() && !isStandalone() && !dismissed,
    dismiss,
  }
}
