// Deriva um nome de exibição a partir do e-mail de login (ex.: "joao.ferreira@madville.com.br" → "Joao Ferreira").
export function nameFromEmail(email) {
  const local = (email || '').split('@')[0]
  const nice = local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
  return nice || email || 'Alguém da equipe'
}

// Iniciais para o avatar do usuário (até 2 letras).
export function initials(name) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
