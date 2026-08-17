import { supabase } from '../supabase/client'

// Acesso direto ao Postgres (network_measurements/network_alerts) — exceção
// documentada ao padrão kv_store do resto do sistema (a mesma exceção já
// existe pra autenticação, em services/supabase/authService.js). Motivo:
// medição de rede é dado de série temporal, de escrita frequente — o
// padrão kv_store (reescrever um blob JSON inteiro a cada gravação) não
// aguenta esse volume. Ver o comentário no topo de
// supabase/migrations/0001_network_monitoring.sql para a explicação completa.

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    )
  }
  return supabase
}

// As colunas SQL são snake_case (convenção do Postgres); o resto do app usa
// camelCase em todo lugar (mesmo os campos guardados como JSON no kv_store).
// Essas duas funções fazem a borda de conversão, pra quem consome
// medições/alertas nunca precisar pensar em snake_case.
function measurementToRow(m) {
  return {
    monitor_uid: m.monitorUid ?? null,
    tipo_medicao: m.tipoMedicao,
    origem: m.origem,
    disponivel: m.disponivel,
    latencia_ms: m.latenciaMs ?? null,
    jitter_ms: m.jitterMs ?? null,
    packet_loss_pct: m.packetLossPct ?? null,
    download_mbps: m.downloadMbps ?? null,
    upload_mbps: m.uploadMbps ?? null,
    unidade: m.unidade ?? null,
    executado_por: m.executadoPor ?? null,
  }
}

function rowToMeasurement(r) {
  return {
    id: r.id,
    monitorUid: r.monitor_uid,
    tipoMedicao: r.tipo_medicao,
    origem: r.origem,
    disponivel: r.disponivel,
    latenciaMs: r.latencia_ms,
    jitterMs: r.jitter_ms,
    packetLossPct: r.packet_loss_pct,
    downloadMbps: r.download_mbps,
    uploadMbps: r.upload_mbps,
    unidade: r.unidade,
    executadoPor: r.executado_por,
    createdAt: r.created_at,
  }
}

function alertToRow(a) {
  return {
    monitor_uid: a.monitorUid,
    tipo: a.tipo,
    severidade: a.severidade,
    mensagem: a.mensagem,
    valor_atual: a.valorAtual ?? null,
    valor_limite: a.valorLimite ?? null,
  }
}

function rowToAlert(r) {
  return {
    id: r.id,
    monitorUid: r.monitor_uid,
    tipo: r.tipo,
    severidade: r.severidade,
    mensagem: r.mensagem,
    valorAtual: r.valor_atual,
    valorLimite: r.valor_limite,
    resolvido: r.resolvido,
    createdAt: r.created_at,
    resolvedAt: r.resolved_at,
  }
}

// Medições de UM ponto monitorado, desde `sinceIso` — usado pelo gráfico de
// histórico da ficha do ponto (mais antiga -> mais nova).
export async function getMeasurementsForMonitor(monitorUid, sinceIso, limit = 2000) {
  const { data, error } = await requireSupabase()
    .from('network_measurements')
    .select('*')
    .eq('monitor_uid', monitorUid)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) throw error
  return data.map(rowToMeasurement)
}

// Medições recentes de TODOS os pontos, numa única consulta limitada — usada
// pra derivar "última medição de cada ponto" (resumo/lista) e a janela curta
// de detecção de oscilação, sem uma requisição por ponto. `limit` é um teto
// físico (não uma paginação): contém o volume mesmo com muitos pontos
// configurados.
export async function getRecentMeasurements(sinceIso, limit = 1000) {
  const { data, error } = await requireSupabase()
    .from('network_measurements')
    .select('*')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.map(rowToMeasurement)
}

function rowToBucket(r) {
  return {
    monitorUid: r.monitor_uid,
    createdAt: r.bucket, // mesmo nome do campo de uma medição crua, pra alimentar os mesmos gráficos
    amostras: Number(r.amostras),
    disponibilidadePct: numOrNull(r.disponibilidade_pct),
    latenciaMin: numOrNull(r.latencia_min),
    latenciaMs: numOrNull(r.latencia_avg), // "latenciaMs" = valor principal da série (média do intervalo)
    latenciaMax: numOrNull(r.latencia_max),
    jitterMs: numOrNull(r.jitter_avg),
    packetLossPct: numOrNull(r.packet_loss_avg),
    packetLossMax: numOrNull(r.packet_loss_max),
    downloadMbps: numOrNull(r.download_avg),
    uploadMbps: numOrNull(r.upload_avg),
  }
}

// numeric do Postgres chega como string no supabase-js (pra não perder
// precisão); os gráficos precisam de number. null continua null — "sem
// medição" nunca vira 0, que seria um dado falso.
function numOrNull(v) {
  return v === null || v === undefined ? null : Number(v)
}

// Medições agregadas por intervalo, via função SQL (ver
// supabase/migrations/0005_measurement_buckets.sql). Diferente de
// getMeasurementsForMonitor (linhas cruas, teto de 2000), aqui o volume
// devolvido depende do TAMANHO DO INTERVALO, não do período pedido — é o
// que torna "últimos 30 dias" viável sem travar o navegador nem cortar o
// período silenciosamente. `monitorUids` null = todos os pontos.
export async function getBucketedMeasurements(sinceIso, bucketSegundos, monitorUids = null) {
  const { data, error } = await requireSupabase().rpc('network_measurements_bucketed', {
    p_since: sinceIso,
    p_bucket_segundos: bucketSegundos,
    p_monitor_uids: monitorUids,
  })
  if (error) throw error
  return data.map(rowToBucket)
}

// Grava uma medição — usada pelo teste de velocidade manual (origem
// 'navegador', ver utils/speedTest.js). O agente local (origem 'agente')
// grava direto via supabase-js do lado dele — ver agent/index.js.
export async function insertMeasurement(measurement) {
  const { error } = await requireSupabase()
    .from('network_measurements')
    .insert(measurementToRow(measurement))
  if (error) throw error
}

export async function getAlerts({ onlyUnresolved = false, limit = 200 } = {}) {
  let query = requireSupabase()
    .from('network_alerts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)
  if (onlyUnresolved) query = query.eq('resolvido', false)
  const { data, error } = await query
  if (error) throw error
  return data.map(rowToAlert)
}

// Evita alerta duplicado: só cria um novo registro se não houver alerta do
// mesmo tipo já aberto (não resolvido) pra aquele ponto.
export async function openAlertIfNew(alert) {
  const sb = requireSupabase()
  const { data: existing, error: selError } = await sb
    .from('network_alerts')
    .select('id')
    .eq('monitor_uid', alert.monitorUid)
    .eq('tipo', alert.tipo)
    .eq('resolvido', false)
    .limit(1)
  if (selError) throw selError
  if (existing.length) return
  const { error } = await sb.from('network_alerts').insert(alertToRow(alert))
  if (error) throw error
}

// Resolve automaticamente qualquer alerta aberto de um tipo específico pra
// um ponto — chamado quando uma medição nova volta a ficar dentro do limite.
export async function resolveAlertsOfType(monitorUid, tipo) {
  const { error } = await requireSupabase()
    .from('network_alerts')
    .update({ resolvido: true, resolved_at: new Date().toISOString() })
    .eq('monitor_uid', monitorUid)
    .eq('tipo', tipo)
    .eq('resolvido', false)
  if (error) throw error
}
