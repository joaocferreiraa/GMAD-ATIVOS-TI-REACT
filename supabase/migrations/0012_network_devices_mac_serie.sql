-- MAC e número de série dos equipamentos de rede.
--
-- POR QUE ISSO APARECEU DEPOIS:
-- na primeira varredura deste parque, 20 câmeras ficaram como "modelo não
-- identificado" — elas servem uma página web de <title> vazio (o título é
-- montado por JavaScript), então não havia o que ler. Testando o aparelho
-- real, descobriu-se que a API de login das câmeras Dahua/Intelbras
-- devolve o MAC e o número de série JUNTO COM O DESAFIO de autenticação,
-- antes de qualquer senha ser enviada. Ver consultarCameraDahua em
-- agent/networkDiscovery.js.
--
-- O MAC vale mais que o IP para identidade: sobrevive a troca de endereço,
-- e os 6 primeiros dígitos dizem o fabricante.
--
-- COMO RODAR: cole no SQL Editor do Supabase e execute. Idempotente.

alter table public.network_devices
  add column if not exists mac text,
  add column if not exists serie text;

comment on column public.network_devices.mac is
  'Endereço MAC, quando o equipamento o revela. Identifica o fabricante e sobrevive à troca de IP.';

comment on column public.network_devices.serie is
  'Número de série informado pelo próprio equipamento.';

-- Busca por MAC: "que aparelho é esse que apareceu no switch?" é a
-- pergunta que se faz com um MAC em mãos.
create index if not exists network_devices_mac_idx
  on public.network_devices (mac)
  where mac is not null;

-- Recria o upsert incluindo os campos novos. Substitui a versão de 0011.
create or replace function public.upsert_network_devices(dados jsonb)
returns integer
language plpgsql
security invoker
as $fn$
declare
  total integer := 0;
begin
  insert into public.network_devices (
    ip, tipo, nome_dns, modelo, identificacao_origem, local, mac, serie,
    portas, responde_ping, visto_em
  )
  select
    d->>'ip',
    d->>'tipo',
    d->>'nomeDns',
    d->>'modelo',
    d->>'identificacaoOrigem',
    d->>'local',
    d->>'mac',
    d->>'serie',
    coalesce(d->'portas', '[]'::jsonb),
    (d->>'respondePing')::boolean,
    now()
  from jsonb_array_elements(dados) as d
  where d->>'ip' is not null
  on conflict (ip) do update set
    tipo = excluded.tipo,
    nome_dns = excluded.nome_dns,
    -- coalesce nos campos de identificação: uma varredura em que o
    -- equipamento não respondeu (estava ocupado, rede oscilando) não deve
    -- apagar o que uma varredura anterior já descobriu.
    modelo = coalesce(excluded.modelo, network_devices.modelo),
    identificacao_origem = coalesce(excluded.identificacao_origem, network_devices.identificacao_origem),
    local = coalesce(excluded.local, network_devices.local),
    mac = coalesce(excluded.mac, network_devices.mac),
    serie = coalesce(excluded.serie, network_devices.serie),
    portas = excluded.portas,
    responde_ping = excluded.responde_ping,
    visto_em = now();

  get diagnostics total = row_count;
  return total;
end $fn$;

grant execute on function public.upsert_network_devices(jsonb) to authenticated;
