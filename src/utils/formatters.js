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

// Data no formato brasileiro a partir de um ISO "yyyy-mm-dd".
export function fmtDate(iso) {
  if (!iso) return '—'
  const parts = iso.split('-')
  if (parts.length !== 3) return iso
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

// Valor monetário em reais. `maximumFractionDigits` opcional (ex.: 0 para o
// total investido do dashboard, sem centavos).
export function fmtMoney(value, { maximumFractionDigits } = {}) {
  const n = parseFloat(value)
  if (Number.isNaN(n)) return '—'
  return n.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    ...(maximumFractionDigits !== undefined && { maximumFractionDigits }),
  })
}

// "Gmad Curitiba" (valor salvo) exibido como "GMAD Curitiba".
export function unitDisplayName(unit) {
  return unit === 'Gmad Curitiba' ? 'GMAD Curitiba' : unit
}

// Situação da garantia de um ativo a partir da data de vencimento (ISO).
// cls: 'ok' | 'warn' (vence em até 60 dias) | 'expired' | 'none' (sem data).
export function warrantyInfo(iso) {
  if (!iso) return { label: '—', cls: 'none' }
  const target = new Date(`${iso}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((target - today) / 86400000)
  if (days < 0) return { label: `Vencida (${fmtDate(iso)})`, cls: 'expired' }
  if (days <= 60) return { label: `Vence em ${days}d`, cls: 'warn' }
  return { label: fmtDate(iso), cls: 'ok' }
}
