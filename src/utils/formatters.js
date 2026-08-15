import { findNameOverride } from './nameOverrides'

// Deriva um nome de exibição a partir do e-mail de login (ex.: "joao.ferreira@madville.com.br" → "Joao Ferreira").
// Sem acento — o e-mail sozinho não carrega essa informação. Nomes com
// acento conhecido têm correção manual em nameOverrides.js.
export function nameFromEmail(email) {
  const override = findNameOverride(email)
  if (override) return override.full

  const local = (email || '').split('@')[0]
  const nice = local
    .split(/[.\-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
  return nice || email || 'Alguém da equipe'
}

// Nome pra saudação do dashboard: normalmente só o primeiro nome, mas usa o
// nome completo quando o e-mail está marcado em nameOverrides.js como
// colidindo com o primeiro nome de outro usuário (ver comentário lá).
export function greetingName(email) {
  const override = findNameOverride(email)
  if (override) return override.short
  return nameFromEmail(email).split(' ')[0]
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

// Saudação conforme o horário local do navegador — mesmo comportamento de
// fmtRelTime(): calculada no momento da renderização, sem atualização
// automática em segundo plano.
export function greetingForHour(date = new Date()) {
  const hour = date.getHours()
  if (hour >= 5 && hour < 12) return 'Bom dia'
  if (hour >= 12 && hour < 18) return 'Boa tarde'
  return 'Boa noite'
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

// Tempo relativo a partir de um timestamp ISO (ex.: "5min atrás"). Calculado
// no momento da chamada, sem atualização automática — mesmo comportamento
// (e mesma limitação) do fmtRelTime() original: se a tela ficar aberta sem
// nenhum outro re-render, o texto fica desatualizado até a próxima renderização.
export function fmtRelTime(iso) {
  if (!iso) return ''
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min atrás`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h atrás`
  const d = Math.floor(h / 24)
  return `${d}d atrás`
}

// Horário da última sincronização com o Supabase, para o tooltip do
// indicador da Topbar — equivalente ao relativeSyncTime() original (formato
// diferente de fmtRelTime(): "Agora"/"há N minutos", depois vira HH:mm).
export function relativeSyncTime(lastSync) {
  if (!lastSync) return '—'
  const diffMin = Math.floor((Date.now() - lastSync.getTime()) / 60000)
  if (diffMin < 1) return 'Agora'
  if (diffMin === 1) return 'há 1 minuto'
  if (diffMin < 60) return `há ${diffMin} minutos`
  return lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Situação da garantia de um ativo a partir da data de vencimento (ISO).
// cls: 'ok' | 'warn' (vence em até 60 dias) | 'expired' | 'missing' (sem data).
export function warrantyInfo(iso) {
  if (!iso) return { label: 'Sem garantia', cls: 'missing' }
  const target = new Date(`${iso}T00:00:00`)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const days = Math.round((target - today) / 86400000)
  if (days < 0) return { label: `Vencida (${fmtDate(iso)})`, cls: 'expired' }
  if (days <= 60) return { label: `Vence em ${days}d`, cls: 'warn' }
  return { label: fmtDate(iso), cls: 'ok' }
}

// Mesma coisa, mas ciente da exceção das impressoras: "Sem garantia" só se
// aplica a impressoras marcadas como Compradas — alugadas e as ainda sem
// Situação definida não têm esse dado cobrado (mantém o "—" neutro).
export function assetWarrantyInfo(asset) {
  const info = warrantyInfo(asset.garantiaAte)
  if (info.cls !== 'missing') return info
  const applies = asset.categoria !== 'Impressora' || asset.posse === 'Comprado'
  return applies ? info : { label: '—', cls: 'none' }
}
