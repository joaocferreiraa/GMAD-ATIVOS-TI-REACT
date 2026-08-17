import { supabase } from '../supabase/client'

// Métricas das máquinas que rodam o agente (CPU/memória/disco/uptime) —
// tabela host_metrics, ver supabase/migrations/0006_host_metrics.sql.
// Mesma exceção ao padrão kv_store já documentada em
// measurementsService.js: é série temporal de escrita frequente.

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    )
  }
  return supabase
}

// numeric do Postgres chega como string no supabase-js (pra não perder
// precisão); os gráficos precisam de number. null continua null.
function num(v) {
  return v === null || v === undefined ? null : Number(v)
}

function rowToMetric(r) {
  return {
    id: r.id,
    host: r.host,
    rotulo: r.rotulo,
    plataforma: r.plataforma,
    cpuPct: num(r.cpu_pct),
    cpuNucleos: r.cpu_nucleos,
    memTotalBytes: num(r.mem_total_bytes),
    memUsadaBytes: num(r.mem_usada_bytes),
    memPct: num(r.mem_pct),
    discoTotalBytes: num(r.disco_total_bytes),
    discoLivreBytes: num(r.disco_livre_bytes),
    discoPct: num(r.disco_pct),
    uptimeSegundos: num(r.uptime_segundos),
    createdAt: r.created_at,
  }
}

function rowToBucket(r) {
  return {
    host: r.host,
    createdAt: r.bucket,
    amostras: Number(r.amostras),
    cpuPct: num(r.cpu_avg),
    cpuMax: num(r.cpu_max),
    memPct: num(r.mem_avg),
    memMax: num(r.mem_max),
    discoPct: num(r.disco_avg),
    uptimeSegundos: num(r.uptime_max),
  }
}

// Métricas recentes de todos os hosts (mais nova -> mais antiga) — usado
// pra derivar o estado ATUAL de cada máquina nos cards do painel.
export async function getRecentHostMetrics(sinceIso, limit = 500) {
  const { data, error } = await requireSupabase()
    .from('host_metrics')
    .select('*')
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (error) throw error
  return data.map(rowToMetric)
}

// Histórico agregado por intervalo (mesma razão de
// getBucketedMeasurements: períodos longos não cabem crus no navegador).
export async function getBucketedHostMetrics(sinceIso, bucketSegundos, hosts = null) {
  const { data, error } = await requireSupabase().rpc('host_metrics_bucketed', {
    p_since: sinceIso,
    p_bucket_segundos: bucketSegundos,
    p_hosts: hosts,
  })
  if (error) throw error
  return data.map(rowToBucket)
}
