import { supabase } from './client'

// Usuários autorizados são criados no painel do Supabase, em Authentication → Users.
// O login aceita "nome.sobrenome" (sem @) e completa com este domínio.
const LOGIN_DOMAIN = 'madville.com.br'

export function buildLoginEmail(rawUser) {
  const value = rawUser.trim()
  return value.includes('@') ? value : `${value}@${LOGIN_DOMAIN}`
}

export async function signInWithPassword(rawUser, password) {
  const email = buildLoginEmail(rawUser)
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

export async function getSession() {
  return supabase.auth.getSession()
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
