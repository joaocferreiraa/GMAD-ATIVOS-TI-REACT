// Usuários autorizados são criados no painel do Supabase, em
// Authentication → Users. O login aceita "nome.sobrenome" (sem @) e
// completa com este domínio.
//
// Mora aqui, e não dentro do authService, porque os scripts de manutenção
// em scripts/ precisam da MESMA regra para autenticar com o login do
// painel — e o authService importa o client do Supabase, que só existe no
// navegador (usa import.meta.env). Regra duplicada é regra que sai do ar
// no dia em que o domínio mudar.
export const LOGIN_DOMAIN = 'gmad.ti'

export function buildLoginEmail(rawUser) {
  const value = String(rawUser ?? '').trim()
  return value.includes('@') ? value : `${value}@${LOGIN_DOMAIN}`
}
