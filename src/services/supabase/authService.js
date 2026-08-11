import { supabase } from './client'

// Usuários autorizados são criados no painel do Supabase, em Authentication → Users.
// O login aceita "nome.sobrenome" (sem @) e completa com este domínio.
const LOGIN_DOMAIN = 'gmad.ti'

function buildLoginEmail(rawUser) {
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

// Busca o usuário direto do servidor (ao contrário de getSession, que só lê
// a sessão já em cache no navegador) — usado para refletir mudanças feitas
// fora do app, como alteração de e-mail pelo painel do Supabase.
export async function refreshUser() {
  return supabase.auth.getUser()
}

export function onAuthStateChange(callback) {
  return supabase.auth.onAuthStateChange(callback)
}
