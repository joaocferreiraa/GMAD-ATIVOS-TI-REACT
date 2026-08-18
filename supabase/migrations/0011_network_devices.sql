-- Equipamentos de rede descobertos pela varredura: impressoras, câmeras,
-- switches, nobreaks — tudo que NÃO roda o agente de inventário.
--
-- POR QUE UMA TABELA SEPARADA de host_inventory:
-- são graus de conhecimento diferentes. `host_inventory` sabe tudo da
-- máquina porque o agente roda DENTRO dela (pentes de RAM, programas
-- instalados, disco). Aqui o equipamento é visto de FORA, pela rede: dá
-- para saber que responde, que portas tem e, com sorte, o modelo. Misturar
-- os dois deixaria metade das colunas sempre nula em cada linha, e o
-- machine_uid (UUID de placa-mãe) não existe numa impressora.
--
-- COMO RODAR: cole no SQL Editor do Supabase e execute. Idempotente.

create table if not exists public.network_devices (
  -- O IP é a chave: numa impressora não há UUID de hardware para ler, e o
  -- endereço é como o equipamento é alcançado e identificado no dia a dia.
  -- Trocar o IP de um equipamento cria uma linha nova, o que é honesto —
  -- do ponto de vista da rede, é outro endereço.
  ip text primary key,

  tipo text,               -- Impressora | Câmera | Equipamento de rede | Nobreak | Painel web | ...
  nome_dns text,           -- DNS reverso, quando existe
  modelo text,             -- do SNMP ou do título/cabeçalho da interface web
  identificacao_origem text, -- snmp | http | dns — de onde veio o `modelo`
  local text,              -- sysLocation do SNMP, quando alguém preencheu

  -- Portas abertas: [{ porta, servico }]. É o que classifica o
  -- equipamento e o que diz por onde acessá-lo.
  portas jsonb not null default '[]'::jsonb,

  responde_ping boolean,
  -- Vinculação com o cadastro: preenchida na LEITURA (casando o IP com o
  -- campo `ip` dos ativos), não gravada aqui — mesma postura do inventário
  -- de máquinas, em que o coletado e o cadastrado ficam separados.

  visto_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

create index if not exists network_devices_tipo_idx on public.network_devices (tipo);
create index if not exists network_devices_visto_idx on public.network_devices (visto_em desc);

alter table public.network_devices enable row level security;

drop policy if exists "authenticated read/write network devices" on public.network_devices;
create policy "authenticated read/write network devices"
  on public.network_devices
  for all
  to authenticated
  using (true)
  with check (true);

do $realtime$
begin
  alter publication supabase_realtime add table public.network_devices;
exception
  when duplicate_object then null;
end $realtime$;

alter table public.network_devices replica identity full;

-- Upsert de uma varredura inteira, em uma chamada.
--
-- Em lote (e não uma chamada por equipamento) porque uma varredura de /24
-- encontra dezenas de aparelhos de uma vez: 35 chamadas HTTP separadas
-- seriam lentas e deixariam a tela atualizando aos pedaços.
--
-- `criado_em` preservado no update, mesma razão do inventário de máquinas:
-- é a resposta para "desde quando esse equipamento existe na rede?".
create or replace function public.upsert_network_devices(dados jsonb)
returns integer
language plpgsql
security invoker
as $fn$
declare
  total integer := 0;
begin
  insert into public.network_devices (
    ip, tipo, nome_dns, modelo, identificacao_origem, local, portas, responde_ping, visto_em
  )
  select
    d->>'ip',
    d->>'tipo',
    d->>'nomeDns',
    d->>'modelo',
    d->>'identificacaoOrigem',
    d->>'local',
    coalesce(d->'portas', '[]'::jsonb),
    (d->>'respondePing')::boolean,
    now()
  from jsonb_array_elements(dados) as d
  where d->>'ip' is not null
  on conflict (ip) do update set
    tipo = excluded.tipo,
    nome_dns = excluded.nome_dns,
    -- coalesce no modelo: uma varredura em que o equipamento não respondeu
    -- ao HTTP (estava ocupado imprimindo) não deve apagar o modelo que uma
    -- varredura anterior já descobriu.
    modelo = coalesce(excluded.modelo, network_devices.modelo),
    identificacao_origem = coalesce(excluded.identificacao_origem, network_devices.identificacao_origem),
    local = coalesce(excluded.local, network_devices.local),
    portas = excluded.portas,
    responde_ping = excluded.responde_ping,
    visto_em = now();

  get diagnostics total = row_count;
  return total;
end $fn$;

grant execute on function public.upsert_network_devices(jsonb) to authenticated;

-- Remoção manual (equipamento desativado). Não há limpeza automática por
-- idade: um equipamento que ficou semanas sem responder pode estar só
-- desligado, e apagá-lo sozinho perderia o registro de que ele existe.
create or replace function public.remover_network_device(p_ip text)
returns void
language sql
as $del$
  delete from public.network_devices where ip = p_ip;
$del$;

grant execute on function public.remover_network_device(text) to authenticated;
