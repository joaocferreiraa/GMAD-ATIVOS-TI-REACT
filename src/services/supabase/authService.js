import { supabase } from './client'
import { buildLoginEmail } from '../../utils/loginEmail'

export async function signInWithPassword(rawUser, password) {
  const email = buildLoginEmail(rawUser)
  return supabase.auth.signInWithPassword({ email, password })
}

export async function signOut() {
  return supabase.auth.signOut()
}

// Troca a senha do usuário da sessão atual.
//
// O Supabase NÃO pede a senha antiga aqui — basta uma sessão válida. Isso
// significa que qualquer pessoa numa máquina destravada trocaria a senha e
// trancaria o dono para fora, cenário nada teórico num painel de TI que fica
// aberto o dia todo em estação compartilhada.
//
// Por isso quem chama confere a senha atual antes (ver ChangePasswordModal):
// não existe API de "só verifique esta senha" no Supabase, então a conferência
// é um signInWithPassword do próprio usuário — sessão nova pro mesmo usuário,
// sem efeito colateral, e um erro ali não derruba a sessão em curso.
export async function updatePassword(newPassword) {
  return supabase.auth.updateUser({ password: newPassword })
}

// Campos de perfil do usuario (setor, cargo, nome). Vao pro user_metadata,
// que e o lugar do Supabase pra dado do proprio usuario e ja e lido pelo app
// (ver useItContext). Como o metadata viaja dentro do JWT, so entra aqui
// texto curto -- a foto mora no kv_store, ver perfilService.
//
// updateUser faz merge raso do objeto `data`: chave nao enviada permanece
// como estava, entao da pra gravar so o que mudou sem reenviar o resto.
export async function updateProfileMetadata(data) {
  return supabase.auth.updateUser({ data })
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
