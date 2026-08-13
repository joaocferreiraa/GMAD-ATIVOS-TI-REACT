-- Monitoramento de Rede — tabelas de medições e alertas.
--
-- POR QUE TABELAS DE VERDADE E NÃO kv_store:
-- Todo o resto do sistema guarda cada módulo como um único blob JSON na
-- tabela kv_store (um `kvSet` reescreve a lista inteira a cada gravação).
-- Isso funciona bem para listas pequenas e de escrita rara (Ativos,
-- Contatos, Estoque...). Medição de rede é o oposto: um único ponto
-- monitorado a cada 30s já gera ~2.880 linhas/dia — reescrever um blob
-- JSON inteiro a cada medição (e brigar por compare-and-swap com outras
-- medições concorrentes de outros pontos) ficaria lento, arriscado e
-- degradaria a tabela kv_store pra TODOS os outros módulos do sistema.
-- Por isso `network_measurements`/`network_alerts` são tabelas relacionais
-- normais, e só a configuração dos pontos monitorados (poucas dezenas de
-- linhas, escrita rara) continua no kv_store, como todo o resto — ver
-- src/services/monitoramento/monitoresService.js.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase
-- (https://app.supabase.com/project/_/sql) e execute. Idempotente — pode
-- rodar de novo sem duplicar nada.

create table if not exists public.network_measurements (
  id bigint generated always as identity primary key,
  monitor_uid text, -- referência "solta" ao `uid` do ponto em kv_store (gmad_network_monitors) — mesmo padrão de referência sem FK usado em pcVinculado/contatoCelularInfo no resto do sistema, já que o ponto vive fora do banco relacional. Nulo = teste de velocidade avulso do navegador (não preso a um ponto cadastrado, ver `unidade`/`executado_por` abaixo).
  tipo_medicao text not null check (tipo_medicao in ('ping', 'speedtest')),
  origem text not null check (origem in ('agente', 'navegador')),
  disponivel boolean not null default true, -- false = a checagem falhou (ex: sem resposta) — status "offline"/"indisponível", nunca inventamos um número quando isso acontece.
  latencia_ms numeric(10, 2),
  jitter_ms numeric(10, 2),
  packet_loss_pct numeric(5, 2),
  download_mbps numeric(10, 2),
  upload_mbps numeric(10, 2),
  unidade text, -- denormalizado: usado quando a medição não está presa a um ponto cadastrado (teste de velocidade avulso feito por alguém no navegador).
  executado_por text, -- e-mail de quem rodou o teste manual (origem = 'navegador'); null para medições do agente.
  created_at timestamptz not null default now()
);

-- Se você já rodou uma versão anterior deste arquivo (com `monitor_uid text
-- not null`), esta linha corrige a tabela existente — idempotente, não
-- erra se a coluna já aceitar nulo. Necessário: o teste de velocidade
-- avulso do navegador grava monitor_uid = null de propósito (não está
-- preso a nenhum ponto cadastrado).
alter table public.network_measurements alter column monitor_uid drop not null;

create index if not exists network_measurements_monitor_time_idx
  on public.network_measurements (monitor_uid, created_at desc);

create index if not exists network_measurements_time_idx
  on public.network_measurements (created_at desc);

create table if not exists public.network_alerts (
  id bigint generated always as identity primary key,
  monitor_uid text not null,
  tipo text not null check (tipo in ('offline', 'latencia', 'packet_loss', 'velocidade', 'oscilacao')),
  severidade text not null check (severidade in ('atencao', 'problema')),
  mensagem text not null,
  valor_atual numeric(10, 2),
  valor_limite numeric(10, 2),
  resolvido boolean not null default false,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index if not exists network_alerts_monitor_idx
  on public.network_alerts (monitor_uid, resolvido, created_at desc);

-- RLS: mesma postura de acesso já usada em todo o resto do banco (kv_store)
-- hoje — qualquer sessão autenticada (equipe de TI, e a conta dedicada do
-- agente local, ver agent/README.md) lê e grava livremente. Não introduz
-- um modelo de permissão novo/diferente do resto do sistema.
alter table public.network_measurements enable row level security;
alter table public.network_alerts enable row level security;

drop policy if exists "authenticated read/write measurements" on public.network_measurements;
create policy "authenticated read/write measurements"
  on public.network_measurements
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "authenticated read/write alerts" on public.network_alerts;
create policy "authenticated read/write alerts"
  on public.network_alerts
  for all
  to authenticated
  using (true)
  with check (true);

-- Realtime: permite que o painel assine INSERTs novos em vez de fazer
-- polling (ver src/hooks/data/useMedicoes.js). Se o projeto já usa a
-- publicação padrão supabase_realtime, isso só adiciona as duas tabelas
-- novas a ela. `ALTER PUBLICATION ... ADD TABLE` não tem "IF NOT EXISTS" —
-- os blocos DO abaixo engolem o erro "already member of publication" pra
-- rodar de novo sem quebrar (mesma idempotência do resto do arquivo).
do $$
begin
  alter publication supabase_realtime add table public.network_measurements;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.network_alerts;
exception
  when duplicate_object then null;
end $$;

-- Retenção: função utilitária que apaga medições detalhadas com mais de 30
-- dias (dados agregados/alertas continuam). NÃO é agendada automaticamente
-- aqui — decida antes se quer rodar isso via pg_cron (extensão precisa
-- estar habilitada no projeto) ou via o próprio agente local, e com qual
-- período. Chame manualmente com `select public.cleanup_network_measurements();`
-- pra testar.
create or replace function public.cleanup_network_measurements(retencao_dias integer default 30)
returns void
language sql
as $$
  delete from public.network_measurements
  where created_at < now() - (retencao_dias || ' days')::interval;
$$;

-- Exemplo (comentado) de agendamento diário via pg_cron, se a extensão
-- estiver disponível no seu projeto Supabase:
-- select cron.schedule('network-measurements-cleanup', '0 3 * * *',
--   $$select public.cleanup_network_measurements(30);$$);
