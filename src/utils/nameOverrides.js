// Correções manuais de nome por e-mail de login (Authentication → Users no
// Supabase). Necessário porque o nome exibido é derivado só do e-mail
// (nameFromEmail, em formatters.js) — sem acento, e sem como saber se duas
// pessoas dividem o mesmo primeiro nome (o app não lista todos os usuários
// do Supabase Auth, só a sessão atual).
//
// Adicione uma entrada aqui sempre que:
// - o nome derivado do e-mail sair sem acento (ex.: "Joao" → "João");
// - dois usuários tiverem o mesmo primeiro nome — nesse caso, defina
//   `short` igual a `full` (nome completo) pra saudação diferenciar os dois.
//
// full  → nome mostrado na sidebar, topbar e registro de autor das ações.
// short → nome mostrado na saudação do dashboard (normalmente só o primeiro
//         nome; use o nome completo quando houver colisão de primeiro nome).
export const NAME_OVERRIDES = {
  'joao.ferreira@gmad.ti': { full: 'João Ferreira', short: 'João' },
}

export function findNameOverride(email) {
  if (!email) return undefined
  return NAME_OVERRIDES[email.trim().toLowerCase()]
}
