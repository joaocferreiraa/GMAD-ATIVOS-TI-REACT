-- Agregação de medições por intervalo de tempo ("buckets") — base dos
-- gráficos de período longo do Monitoramento de Rede.
--
-- POR QUE ISSO EXISTE:
-- O gráfico carregava medições cruas com `limit 2000` (ver
-- getMeasurementsForMonitor). Um ponto pingado a cada 30s gera ~2.880
-- medições/dia — ou seja, "últimos 30 dias" (~86 mil linhas) não só
-- estouraria a memória do navegador como, com o limite de 2000, mostrava
-- SILENCIOSAMENTE apenas as ~16 primeiras horas do período, com o eixo
-- alegando 30 dias. Agregar no banco (como Grafana/Zabbix fazem) devolve
-- um número fixo de pontos independente do período pedido, e de quebra
-- preserva os picos: a média sozinha esconde um espasmo de latência, então
-- devolvemos min/avg/max por intervalo pra desenhar a banda de variação.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase
-- (https://app.supabase.com/project/_/sql) e execute. Idempetente — pode
-- rodar de novo sem duplicar nada.

-- Agrega as medições de UM ou VÁRIOS pontos em intervalos de
-- `bucket_segundos`, devolvendo min/média/máx de cada métrica por intervalo.
--
-- date_bin() (Postgres 14+) alinha cada medição a uma grade fixa de
-- intervalos a partir de uma origem — todos os pontos monitorados caem
-- exatamente nos mesmos instantes, o que é o que permite desenhar várias
-- séries sobrepostas no mesmo gráfico sem "escorregar" uma em relação à
-- outra.
--
-- `monitor_uids` = null significa "todos os pontos" (usado pelo gráfico
-- comparativo); passe um array pra filtrar.
create or replace function public.network_measurements_bucketed(
  p_since timestamptz,
  p_bucket_segundos integer,
  p_monitor_uids text[] default null
)
returns table (
  monitor_uid text,
  bucket timestamptz,
  amostras bigint,
  -- Disponibilidade em % do intervalo: média de "quantas checagens
  -- responderam". É o número que Zabbix/Grafana chamam de uptime, e só faz
  -- sentido agregado (uma medição isolada é 0% ou 100%).
  disponibilidade_pct numeric,
  latencia_min numeric,
  latencia_avg numeric,
  latencia_max numeric,
  jitter_avg numeric,
  packet_loss_avg numeric,
  packet_loss_max numeric,
  download_avg numeric,
  upload_avg numeric
)
language sql
stable
as $$
  select
    m.monitor_uid,
    date_bin(
      make_interval(secs => greatest(p_bucket_segundos, 1)),
      m.created_at,
      timestamptz 'epoch'
    ) as bucket,
    count(*) as amostras,
    round(avg(case when m.disponivel then 100 else 0 end), 2) as disponibilidade_pct,
    -- Só medições disponíveis entram nas estatísticas de latência: um ping
    -- que não respondeu não tem latência "0", tem latência desconhecida —
    -- incluí-lo puxaria a média pra baixo e faria uma queda parecer uma
    -- melhora. A indisponibilidade já é reportada em disponibilidade_pct.
    round(min(m.latencia_ms) filter (where m.disponivel), 2) as latencia_min,
    round(avg(m.latencia_ms) filter (where m.disponivel), 2) as latencia_avg,
    round(max(m.latencia_ms) filter (where m.disponivel), 2) as latencia_max,
    round(avg(m.jitter_ms) filter (where m.disponivel), 2) as jitter_avg,
    round(avg(m.packet_loss_pct) filter (where m.disponivel), 2) as packet_loss_avg,
    round(max(m.packet_loss_pct) filter (where m.disponivel), 2) as packet_loss_max,
    round(avg(m.download_mbps) filter (where m.disponivel), 2) as download_avg,
    round(avg(m.upload_mbps) filter (where m.disponivel), 2) as upload_avg
  from public.network_measurements m
  where m.created_at >= p_since
    and (p_monitor_uids is null or m.monitor_uid = any(p_monitor_uids))
    and m.monitor_uid is not null
  group by m.monitor_uid, bucket
  order by m.monitor_uid, bucket;
$$;

-- A função roda com os privilégios de quem chama, então o RLS de
-- network_measurements continua valendo normalmente (sessão autenticada) —
-- não é um caminho paralelo de leitura sem permissão.
grant execute on function public.network_measurements_bucketed(timestamptz, integer, text[]) to authenticated;
