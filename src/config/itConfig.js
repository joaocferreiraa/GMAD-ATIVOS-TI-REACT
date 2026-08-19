// Constantes e helpers do módulo de TI — status/prioridade de chamados,
// cores, cálculo de SLA e verificação de quem é da equipe de TI.

// Rótulos seguem a nomenclatura do GLPI (Novo / Em atendimento / Pendente /
// Solucionado / Fechado), que é o vocabulário que a equipe de TI já usa.
//
// As CHAVES continuam as originais (aberto, aguardando_usuario, resolvido):
// elas são o valor gravado na coluna `status` e estão no CHECK constraint da
// tabela helpdesk_tickets (ver 0002_helpdesk_tickets.sql). Renomeá-las exigiria
// migração de dados — e o que a equipe lê na tela é o label, não a chave.
export const TICKET_STATUSES = {
  aberto: { label: 'Novo', color: 'var(--info)', bg: 'var(--info-bg)' },
  em_atendimento: { label: 'Em atendimento', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  aguardando_usuario: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  resolvido: { label: 'Solucionado', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  fechado: { label: 'Fechado', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
  cancelado: { label: 'Cancelado', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
}

export const FINAL_STATUSES = ['resolvido', 'fechado', 'cancelado']

export const TICKET_PRIORITIES = {
  baixa: {
    label: 'Baixa',
    color: '#16a34a',
    bg: 'rgba(22,163,74,0.12)',
    order: 1,
    slaHours: 48,
    description: 'Sem urgência, não impede o trabalho.',
  },
  media: {
    label: 'Média',
    color: 'var(--info)',
    bg: 'var(--info-bg)',
    order: 2,
    slaHours: 24,
    description: 'Impacto moderado no dia a dia.',
  },
  alta: {
    label: 'Alta',
    color: '#f59e0b',
    bg: 'rgba(245,158,11,0.12)',
    order: 3,
    slaHours: 8,
    description: 'Impede parte do trabalho, precisa de atenção logo.',
  },
  urgente: {
    label: 'Urgente',
    color: '#ef4444',
    bg: 'rgba(239,68,68,0.12)',
    order: 4,
    slaHours: 2,
    description: 'Trabalho totalmente parado.',
  },
}

// Categorias no padrão GLPI: hierarquia "Área > Assunto", que é como o GLPI
// organiza as categorias de chamado. O valor gravado é a string inteira.
export const TICKET_CATEGORIES = [
  'Hardware > Computador',
  'Hardware > Impressora',
  'Hardware > Periférico',
  'Software > Instalação',
  'Software > Erro em sistema',
  'Software > Licença',
  'Rede > Acesso à internet',
  'Rede > Cabeamento / Wi-Fi',
  'Rede > Telefonia',
  'Contas > Acesso e senha',
  'Contas > E-mail',
  'Contas > Permissões',
  'Outro',
]

export const ASSET_TYPES = [
  'Notebook',
  'Desktop',
  'Monitor',
  'Impressora',
  'Roteador',
  'Switch',
  'Celular',
  'Outro',
]

export const ASSET_STATUSES = {
  em_uso: { label: 'Em Uso', color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
  em_estoque: { label: 'Em Estoque', color: '#16a34a', bg: 'rgba(22,163,74,0.12)' },
  manutencao: { label: 'Manutenção', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  descartado: { label: 'Descartado', color: '#64748b', bg: 'rgba(100,116,139,0.12)' },
}

export const KB_CATEGORIES = ['Tutoriais', 'Procedimentos', 'Erros Comuns', 'Políticas', 'Outro']

export const SLA_COLORS = {
  ok: 'var(--text-muted)',
  warning: '#f59e0b',
  overdue: '#ef4444',
  none: 'var(--text-muted)',
}

// Verifica se o usuário logado pertence à equipe de TI (para liberar ações
// administrativas nas telas). Ajuste os valores conforme sua organização.
export function isITStaff({ userRole, group, jobTitle } = {}) {
  const norm = (s) => (s || '').toString().trim().toLowerCase()
  if (norm(userRole) === 'admin' || norm(userRole) === 'ti') return true
  if (norm(group).includes('ti') || norm(group).includes('tecnologia')) return true
  if (norm(jobTitle).includes('ti') || norm(jobTitle).includes('suporte')) return true
  return false
}

export function formatTicketNumber(n) {
  if (n == null) return '—'
  return `#${String(n).padStart(4, '0')}`
}

export function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Calcula o estado de SLA de um chamado (ok / warning / overdue / none),
// usado pelo SlaBadge e pelos dashboards.
export function slaStatus(ticket) {
  if (!ticket?.sla_due_at || FINAL_STATUSES.includes(ticket.status)) {
    return { state: 'none', label: '—' }
  }
  const due = new Date(ticket.sla_due_at).getTime()
  const now = Date.now()
  const hoursLeft = (due - now) / 3600000

  if (hoursLeft < 0) {
    return { state: 'overdue', label: `Vencido há ${Math.abs(hoursLeft).toFixed(1)}h` }
  }
  if (hoursLeft < 4) {
    return { state: 'warning', label: `Vence em ${hoursLeft.toFixed(1)}h` }
  }
  return { state: 'ok', label: `Vence em ${hoursLeft.toFixed(0)}h` }
}
