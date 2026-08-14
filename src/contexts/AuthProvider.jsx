import { useEffect, useMemo, useState } from 'react'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { supabase } from '../services/supabase/client'
import {
  getSession,
  onAuthStateChange,
  refreshUser,
  signInWithPassword,
  signOut as signOutRequest,
} from '../services/supabase/authService'
import { AuthContext } from './AuthContext'

// status: 'loading' (checando sessão existente) | 'authenticated' | 'unauthenticated'
export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [status, setStatus] = useState(supabase ? 'loading' : 'unauthenticated')

  useEffect(() => {
    if (!supabase) return

    let active = true

    getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session ?? null)
      setStatus(data.session ? 'authenticated' : 'unauthenticated')
    })

    const {
      data: { subscription },
    } = onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      setStatus(nextSession ? 'authenticated' : 'unauthenticated')
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  // Ao voltar o foco pra aba, busca o usuário direto do servidor: pega
  // mudanças feitas fora do app (ex.: e-mail alterado no painel do
  // Supabase) sem precisar de logout/login manual. Se o usuário da sessão
  // em cache não existir mais no servidor (ex.: conta recriada em vez de
  // editada), a sessão fica "órfã" e some sozinha sem isso — então força
  // logout pra mandar de volta pro login.
  useEffect(() => {
    if (!supabase) return

    function handleFocus() {
      if (document.visibilityState !== 'visible') return
      refreshUser().then(({ data, error }) => {
        if (error) {
          // Erro de rede/indisponibilidade passageira do Supabase (Wi-Fi
          // engasgou, serviço fora do ar por um instante) NÃO significa que
          // a sessão é inválida — só não deu pra confirmar agora. Só desloga
          // quando o erro veio mesmo da API dizendo que a sessão não vale
          // mais (ex: usuário removido, token inválido) — senão, alguém no
          // meio de um formulário que só voltou o foco pra aba perderia o
          // que não salvou por causa de uma falha de rede momentânea.
          if (!isAuthRetryableFetchError(error)) {
            signOutRequest()
          }
          return
        }
        if (!data.user) return
        setSession((current) => (current ? { ...current, user: data.user } : current))
      })
    }

    document.addEventListener('visibilitychange', handleFocus)
    window.addEventListener('focus', handleFocus)
    return () => {
      document.removeEventListener('visibilitychange', handleFocus)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      session,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      isSupabaseConfigured: Boolean(supabase),
      signIn: (rawUser, password) => signInWithPassword(rawUser, password),
      signOut: () => signOutRequest(),
    }),
    [session, status],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
