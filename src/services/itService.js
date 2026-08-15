import { supabase } from './supabase/client'

// Helpdesk de TI — acesso direto ao Postgres (helpdesk_tickets/_comments/
// _events), exceção documentada ao padrão kv_store do resto do sistema (a
// mesma exceção já existe para monitoramento de rede e autenticação).
// Motivo: chamado é dado de escrita frequente e concorrente — vários
// técnicos mexendo na fila, mais o bot do WhatsApp gravando um comentário a
// cada mensagem recebida. Ver o comentário no topo de
// supabase/migrations/0002_helpdesk_tickets.sql.
//
// As colunas SQL são snake_case em português (convenção do Postgres e do
// resto do schema). As telas de TI vieram de outro projeto e consomem
// snake_case em inglês (requester_name, assignee, created_at...). As funções
// rowTo* abaixo fazem essa borda de tradução — renomear tudo nas telas seria
// uma mudança grande e sem ganho.

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    )
  }
  return supabase
}

// Prazo de SLA por prioridade, em horas — espelha SLA_HOURS em config/itConfig.js
const SLA_HORAS = { baixa: 48, media: 24, alta: 8, urgente: 2 }
const STATUS_FINAIS = ['resolvido', 'fechado', 'cancelado']

function rowToTicket(r) {
  return {
    id: r.id,
    ticket_number: r.id,
    title: r.titulo,
    description: r.descricao,
    status: r.status,
    priority: r.prioridade,
    category: r.categoria,
    source: r.origem,
    requester: r.solicitante,
    requester_name: r.solicitante_nome,
    phone: r.telefone,
    assignee: r.responsavel,
    assignee_name: r.responsavel_nome,
    department: r.setor,
    location: r.local,
    rating: r.avaliacao,
    rating_comment: r.avaliacao_comentario,
    sla_due_at: r.sla_prazo,
    resolved_at: r.resolvido_em,
    created_at: r.created_at,
  }
}

function rowToComment(r) {
  return {
    id: r.id,
    author: r.autor,
    author_name: r.autor_nome,
    content: r.conteudo,
    is_internal: r.interno,
    created_at: r.created_at,
  }
}

function rowToEvent(r) {
  return {
    id: r.id,
    event_type: r.tipo,
    from_value: r.de,
    to_value: r.para,
    author: r.autor,
    author_name: r.autor_nome,
    created_at: r.created_at,
  }
}

function slaPrazoDe(prioridade) {
  const horas = SLA_HORAS[prioridade] ?? SLA_HORAS.media
  return new Date(Date.now() + horas * 3600_000).toISOString()
}

async function registrarEvento(ticketId, tipo, de, para, autor, autorNome) {
  const { error } = await requireSupabase().from('helpdesk_events').insert({
    ticket_id: ticketId,
    tipo,
    de: de ?? null,
    para: para ?? null,
    autor: autor ?? null,
    autor_nome: autorNome ?? null,
  })
  // O histórico é secundário: se ele falhar, a ação principal (mudar status,
  // atribuir...) já aconteceu e não deve ser desfeita por causa disso.
  if (error) console.error('[itService] falha ao registrar evento:', error.message)
}

// --- Chamados ---

export async function fetchTickets({ status, requester, limit = 500, start = 0 } = {}) {
  let query = requireSupabase()
    .from('helpdesk_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .range(start, start + limit - 1)

  if (status) query = query.eq('status', status)
  if (requester) query = query.eq('solicitante', requester)

  const { data, error } = await query
  if (error) throw new Error(error.message)
  return (data ?? []).map(rowToTicket)
}

// O dashboard calcula os indicadores no próprio frontend a partir da lista
// completa — por isso é a mesma consulta, com um teto maior.
export async function fetchTicketStats() {
  return fetchTickets({ limit: 1000 })
}

export async function fetchTicket(id) {
  const { data, error } = await requireSupabase()
    .from('helpdesk_tickets')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? rowToTicket(data) : null
}

export async function createTicket({
  title,
  description,
  category,
  priority = 'media',
  department,
  location,
  requester,
  requesterName,
}) {
  const { data, error } = await requireSupabase()
    .from('helpdesk_tickets')
    .insert({
      titulo: title || description?.slice(0, 60) || 'Chamado sem descrição',
      descricao: description,
      categoria: category ?? null,
      prioridade: priority,
      origem: 'painel',
      solicitante: requester ?? null,
      solicitante_nome: requesterName ?? null,
      setor: department ?? null,
      local: location ?? null,
      sla_prazo: slaPrazoDe(priority),
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  const ticket = rowToTicket(data)
  await registrarEvento(ticket.id, 'criacao', null, null, requester, requesterName)
  return ticket
}

async function atualizar(ticketId, patch) {
  const { data, error } = await requireSupabase()
    .from('helpdesk_tickets')
    .update(patch)
    .eq('id', ticketId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return rowToTicket(data)
}

export async function changeStatus(ticket, status, username, name) {
  const patch = { status }

  // Data de resolução acompanha o status: marcada ao concluir, limpa ao reabrir.
  if (STATUS_FINAIS.includes(status) && !ticket.resolved_at) {
    patch.resolvido_em = new Date().toISOString()
  } else if (!STATUS_FINAIS.includes(status) && ticket.resolved_at) {
    patch.resolvido_em = null
  }

  const atualizado = await atualizar(ticket.id, patch)
  await registrarEvento(ticket.id, 'status', ticket.status, status, username, name)
  return atualizado
}

export async function changePriority(ticket, priority, username, name) {
  // O prazo de SLA é derivado da prioridade — mudar uma sem a outra deixaria
  // o indicador de SLA mentindo.
  const atualizado = await atualizar(ticket.id, {
    prioridade: priority,
    sla_prazo: slaPrazoDe(priority),
  })
  await registrarEvento(ticket.id, 'prioridade', ticket.priority, priority, username, name)
  return atualizado
}

export async function assignTicket(ticket, assignee, assigneeName, username, name) {
  const atualizado = await atualizar(ticket.id, {
    responsavel: assignee ?? null,
    responsavel_nome: assigneeName ?? null,
  })
  await registrarEvento(
    ticket.id,
    'atribuicao',
    ticket.assignee_name,
    assigneeName ?? assignee,
    username,
    name,
  )
  return atualizado
}

export async function rateTicket(ticket, rating, comment, username, name) {
  const atualizado = await atualizar(ticket.id, {
    avaliacao: rating,
    avaliacao_comentario: comment || null,
  })
  await registrarEvento(ticket.id, 'avaliacao', null, `${rating}/5`, username, name)
  return atualizado
}

// --- Timeline ---

export async function fetchTicketTimeline(ticketId) {
  const sb = requireSupabase()

  const [comentarios, eventos] = await Promise.all([
    sb.from('helpdesk_comments').select('*').eq('ticket_id', ticketId).order('created_at'),
    sb.from('helpdesk_events').select('*').eq('ticket_id', ticketId).order('created_at'),
  ])

  if (comentarios.error) throw new Error(comentarios.error.message)
  if (eventos.error) throw new Error(eventos.error.message)

  return {
    comments: (comentarios.data ?? []).map(rowToComment),
    events: (eventos.data ?? []).map(rowToEvent),
  }
}

export async function addComment(ticketId, { content, isInternal, author, authorName }) {
  const { data, error } = await requireSupabase()
    .from('helpdesk_comments')
    .insert({
      ticket_id: ticketId,
      conteudo: content,
      interno: Boolean(isInternal),
      autor: author ?? null,
      autor_nome: authorName ?? null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return rowToComment(data)
}

// --- Ativos e Base de Conhecimento (não implementados aqui) ---
//
// As telas ITAssets.jsx e ITKnowledgeBase.jsx vieram junto do módulo mas não
// estão nas rotas: o inventário de equipamentos desta plataforma já é o
// módulo Ativos, com serviço próprio. Mantidos como stubs para não quebrar
// os imports enquanto as telas existirem no repositório.

const NAO_IMPLEMENTADO = 'Módulo ainda não implementado nesta plataforma.'

export async function fetchAssets() {
  return []
}
export async function createAsset() {
  throw new Error(NAO_IMPLEMENTADO)
}
export async function updateAsset() {
  throw new Error(NAO_IMPLEMENTADO)
}
export async function deleteAsset() {
  throw new Error(NAO_IMPLEMENTADO)
}

export async function fetchArticles() {
  return []
}
export async function createArticle() {
  throw new Error(NAO_IMPLEMENTADO)
}
export async function updateArticle() {
  throw new Error(NAO_IMPLEMENTADO)
}
export async function deleteArticle() {
  throw new Error(NAO_IMPLEMENTADO)
}
export async function incrementArticleViews() {
  /* no-op */
}
