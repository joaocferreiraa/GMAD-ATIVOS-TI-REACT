-- Retenção automática das séries temporais + limpeza de medições órfãs.
--
-- POR QUE AGORA:
-- Cada checagem de ping vira uma linha. Com 3 pontos a cada 30s, o ritmo
-- medido é de ~2.200 linhas/dia (~67 mil/mês, ~810 mil/ano). Em espaço:
-- ~13 MB/mês, ~155 MB/ano — o plano free do Supabase (500 MB) só apertaria
-- em ~3 anos. Não é urgente, mas tabela que só cresce acaba degradando as
-- consultas do painel muito antes de encher o disco, e cada ponto novo
-- monitorado multiplica esse ritmo.
--
-- As funções cleanup_* já existiam (ver 0001 e 0006) mas nunca foram
-- agendadas — este arquivo agenda.
--
-- COMO RODAR: cole no SQL Editor do Supabase e execute. Idempotente.

-- ---------------------------------------------------------------------------
-- 1. Medições órfãs: pontos que foram excluídos do painel mas cujas
--    medições continuam na tabela. Elas entram nos gráficos como séries
--    sem nome (o painel mostra "Ponto removido") e poluem as agregações.
--
--    A configuração dos pontos vive no kv_store (chave
--    gmad_network_monitors), então "órfã" = monitor_uid que não está mais
--    naquele JSON. monitor_uid NULL é preservado de propósito: é o teste
--    de velocidade avulso do navegador, que não pertence a ponto nenhum.
-- ---------------------------------------------------------------------------
delete from public.network_measurements m
where m.monitor_uid is not null
  and not exists (
    select 1
    from public.kv_store k,
         jsonb_array_elements(k.value) as ponto
    where k.key = 'gmad_network_monitors'
      and ponto->>'uid' = m.monitor_uid
  );

delete from public.network_alerts a
where not exists (
  select 1
  from public.kv_store k,
       jsonb_array_elements(k.value) as ponto
  where k.key = 'gmad_network_monitors'
    and ponto->>'uid' = a.monitor_uid
);

-- ---------------------------------------------------------------------------
-- 2. Limpeza de alertas antigos JÁ RESOLVIDOS. Alerta aberto nunca é
--    apagado, por mais velho que seja — é justamente o que precisa de
--    atenção.
-- ---------------------------------------------------------------------------
create or replace function public.cleanup_network_alerts(retencao_dias integer default 90)
returns void
language sql
as $$
  delete from public.network_alerts
  where resolvido = true
    and coalesce(resolved_at, created_at) < now() - (retencao_dias || ' days')::interval;
$$;

-- ---------------------------------------------------------------------------
-- 3. Agendamento diário via pg_cron.
--
--    Retenções diferentes por tabela, conforme o uso:
--    - medições (90 dias): o painel mostra no máximo 30 dias; 90 dá folga
--      para comparar com o mês anterior sem guardar histórico eterno.
--    - métricas de host (90 dias): mesma lógica.
--    - alertas resolvidos (180 dias): volume baixíssimo (6 linhas hoje) e
--      valor histórico alto — é o registro do que já deu errado.
--
--    O bloco DO abaixo não falha se a extensão pg_cron não estiver
--    disponível no projeto: nesse caso avisa e as funções continuam
--    podendo ser chamadas manualmente.
-- ---------------------------------------------------------------------------
do $$
begin
  create extension if not exists pg_cron;

  -- unschedule antes de agendar: sem isso, rodar este arquivo de novo
  -- criaria jobs duplicados.
  perform cron.unschedule(jobid)
  from cron.job
  where jobname in ('limpeza-medicoes', 'limpeza-host-metrics', 'limpeza-alertas');

  -- 03:10, 03:20 e 03:30: espaçados para não competirem entre si, em
  -- horário de baixo uso do painel.
  perform cron.schedule('limpeza-medicoes', '10 3 * * *',
    $cmd$select public.cleanup_network_measurements(90);$cmd$);

  perform cron.schedule('limpeza-host-metrics', '20 3 * * *',
    $cmd$select public.cleanup_host_metrics(90);$cmd$);

  perform cron.schedule('limpeza-alertas', '30 3 * * *',
    $cmd$select public.cleanup_network_alerts(180);$cmd$);

  raise notice 'Limpeza automatica agendada: medicoes/host 90 dias, alertas resolvidos 180 dias.';
exception
  when insufficient_privilege or undefined_file then
    raise notice 'pg_cron indisponivel neste projeto. As funcoes cleanup_* existem e podem ser chamadas manualmente.';
end $$;

-- Para conferir o que ficou agendado:
--   select jobname, schedule, command from cron.job;
-- Para rodar uma limpeza na hora:
--   select public.cleanup_network_measurements(90);
