-- Métricas da máquina onde o agente roda (CPU, memória, disco, uptime) —
-- alimenta a aba "Painel de Infraestrutura" do Monitoramento de Rede.
--
-- POR QUE UMA TABELA SEPARADA de network_measurements:
-- São coisas diferentes. `network_measurements` responde "como está a
-- CONEXÃO até um ponto da rede?" (ping, uma linha por ponto monitorado);
-- esta responde "como está a MÁQUINA que faz o monitoramento?" (uma linha
-- por host que roda o agente). Misturar as duas na mesma tabela deixaria
-- metade das colunas sempre nula em cada linha, e o `monitor_uid` não teria
-- significado aqui — métrica de host não pertence a um ponto monitorado.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase
-- (https://app.supabase.com/project/_/sql) e execute. Idempotente — pode
-- rodar de novo sem duplicar nada.

create table if not exists public.host_metrics (
  id bigint generated always as identity primary key,
  -- Identificador da máquina (hostname do SO). Sem FK: assim como
  -- monitor_uid em network_measurements, é uma referência "solta" — vários
  -- agentes podem gravar aqui, cada um com o próprio hostname.
  host text not null,
  -- Rótulo amigável opcional (ex.: "Servidor TI - Madville"), configurável
  -- por AGENT_HOST_LABEL no .env do agente. Null = usa o `host`.
  rotulo text,
  plataforma text, -- win32 | linux | darwin
  cpu_pct numeric(5, 2), -- uso de CPU no intervalo entre duas amostras
  cpu_nucleos integer,
  mem_total_bytes bigint,
  mem_usada_bytes bigint,
  mem_pct numeric(5, 2),
  disco_total_bytes bigint,
  disco_livre_bytes bigint,
  disco_pct numeric(5, 2),
  uptime_segundos bigint,
  created_at timestamptz not null default now()
);

create index if not exists host_metrics_host_time_idx
  on public.host_metrics (host, created_at desc);

create index if not exists host_metrics_time_idx
  on public.host_metrics (created_at desc);

-- RLS: mesma postura do resto do banco — qualquer sessão autenticada
-- (equipe de TI e a conta dedicada do agente) lê e grava.
alter table public.host_metrics enable row level security;

drop policy if exists "authenticated read/write host metrics" on public.host_metrics;
create policy "authenticated read/write host metrics"
  on public.host_metrics
  for all
  to authenticated
  using (true)
  with check (true);

-- Realtime: o painel assina INSERTs pra atualizar sem polling.
do $$
begin
  alter publication supabase_realtime add table public.host_metrics;
exception
  when duplicate_object then null;
end $$;

-- Agregação por intervalo, mesmo motivo de network_measurements_bucketed
-- (ver 0003): sem isso, "últimos 30 dias" de métricas coletadas a cada
-- minuto seriam ~43 mil linhas por host no navegador.
create or replace function public.host_metrics_bucketed(
  p_since timestamptz,
  p_bucket_segundos integer,
  p_hosts text[] default null
)
returns table (
  host text,
  bucket timestamptz,
  amostras bigint,
  cpu_avg numeric,
  cpu_max numeric,
  mem_avg numeric,
  mem_max numeric,
  disco_avg numeric,
  uptime_max bigint
)
language sql
stable
as $$
  select
    h.host,
    date_bin(
      make_interval(secs => greatest(p_bucket_segundos, 1)),
      h.created_at,
      timestamptz 'epoch'
    ) as bucket,
    count(*) as amostras,
    round(avg(h.cpu_pct), 2) as cpu_avg,
    round(max(h.cpu_pct), 2) as cpu_max,
    round(avg(h.mem_pct), 2) as mem_avg,
    round(max(h.mem_pct), 2) as mem_max,
    round(avg(h.disco_pct), 2) as disco_avg,
    max(h.uptime_segundos) as uptime_max
  from public.host_metrics h
  where h.created_at >= p_since
    and (p_hosts is null or h.host = any(p_hosts))
  group by h.host, bucket
  order by h.host, bucket;
$$;

grant execute on function public.host_metrics_bucketed(timestamptz, integer, text[]) to authenticated;

-- Retenção: mesma ideia de cleanup_network_measurements (ver 0001) — NÃO
-- agendada automaticamente; chame manualmente ou agende via pg_cron.
create or replace function public.cleanup_host_metrics(retencao_dias integer default 30)
returns void
language sql
as $$
  delete from public.host_metrics
  where created_at < now() - (retencao_dias || ' days')::interval;
$$;
