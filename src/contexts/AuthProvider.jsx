import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../services/supabase/client'
import {
  getSession,
  onAuthStateChange,
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
