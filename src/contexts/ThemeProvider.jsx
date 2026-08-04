import { useCallback, useMemo, useState } from 'react'
import { ThemeContext } from './ThemeContext'

const THEME_KEY = 'gmad_theme'

// O tema inicial já é aplicado em <html data-theme="..."> por um script inline
// no index.html (antes do primeiro paint, evita flash). Aqui só lemos o que
// já foi decidido e passamos a controlar as trocas a partir daqui.
function readInitialTheme() {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
}

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(readInitialTheme)

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === 'dark' ? 'light' : 'dark'
      document.documentElement.setAttribute('data-theme', next)
      try {
        localStorage.setItem(THEME_KEY, next)
      } catch {
        // localStorage indisponível (modo privado etc.) — tema segue funcionando na sessão atual.
      }
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ theme, isDark: theme === 'dark', toggleTheme }),
    [theme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
