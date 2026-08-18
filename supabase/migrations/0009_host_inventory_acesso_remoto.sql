-- Acesso remoto (RustDesk) no inventário de máquinas.
--
-- O agente passa a coletar o ID do RustDesk de cada máquina (ver
-- agent/inventory.js, coletarRustDeskId), e a ficha da máquina no painel
-- ganha um botão "Acessar" que abre a sessão direto — sem procurar o ID
-- numa planilha.
--
-- POR QUE DUAS COLUNAS (e não só o id):
-- "sem ID" tem dois significados operacionais diferentes, e a distinção é o
-- que torna a informação acionável:
--   rustdesk_instalado = false -> falta instalar o RustDesk nessa máquina
--   rustdesk_instalado = true + id null -> está instalado mas não respondeu
--     (versão antiga sem --get-id, ou serviço parado) — é diagnóstico, não
--     tarefa de instalação.
-- Com uma coluna só, os dois casos ficariam indistinguíveis.
--
-- COMO RODAR: cole no SQL Editor do Supabase e execute. Idempotente.

alter table public.host_inventory
  add column if not exists rustdesk_id text,
  add column if not exists rustdesk_instalado boolean;

comment on column public.host_inventory.rustdesk_id is
  'ID numérico do RustDesk desta máquina (o "número" digitado para abrir a sessão). Null = não coletado; ver rustdesk_instalado para saber por quê.';

comment on column public.host_inventory.rustdesk_instalado is
  'true = rustdesk.exe encontrado na máquina. Com rustdesk_id null, significa instalado mas sem responder (versão antiga ou serviço parado).';

-- Busca por ID: "que máquina é o 429987241?" é a pergunta inversa que
-- aparece quando alguém liga pedindo suporte e informa o número da tela.
create index if not exists host_inventory_rustdesk_idx
  on public.host_inventory (rustdesk_id)
  where rustdesk_id is not null;

-- ---------------------------------------------------------------------------
-- Recria o upsert incluindo as colunas novas.
--
-- coalesce nos dois campos: um agente ANTIGO (ainda na versão 1.1.0, sem a
-- coleta de RustDesk) manda o JSON sem essas chaves. Sem o coalesce, a
-- coleta dele apagaria o ID que uma versão nova já havia gravado — e num
-- parque de 60+ máquinas os agentes nunca estão todos na mesma versão ao
-- mesmo tempo. Com ele, o valor antigo é preservado até o agente daquela
-- máquina ser atualizado.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_host_inventory(dados jsonb)
returns void
language plpgsql
security invoker
as $fn$
begin
  insert into public.host_inventory (
    machine_uid, hostname, dominio, usuario_logado, fabricante, modelo,
    numero_serie, tipo_chassi, so_nome, so_versao, so_build, so_arquitetura,
    so_instalado_em, cpu_modelo, cpu_fabricante, cpu_nucleos, cpu_threads,
    cpu_clock_mhz, ram_total_bytes, ram_slots_usados, ram_slots_totais,
    ram_pentes, discos, disco_total_bytes, disco_livre_bytes, gpus,
    adaptadores_rede, softwares, rustdesk_id, rustdesk_instalado,
    agente_versao, coletado_em
  )
  values (
    dados->>'machineUid',
    dados->>'hostname',
    dados->>'dominio',
    dados->>'usuarioLogado',
    dados->>'fabricante',
    dados->>'modelo',
    dados->>'numeroSerie',
    dados->>'tipoChassi',
    dados->>'soNome',
    dados->>'soVersao',
    dados->>'soBuild',
    dados->>'soArquitetura',
    (dados->>'soInstaladoEm')::timestamptz,
    dados->>'cpuModelo',
    dados->>'cpuFabricante',
    (dados->>'cpuNucleos')::integer,
    (dados->>'cpuThreads')::integer,
    (dados->>'cpuClockMhz')::integer,
    (dados->>'ramTotalBytes')::bigint,
    (dados->>'ramSlotsUsados')::integer,
    (dados->>'ramSlotsTotais')::integer,
    coalesce(dados->'ramPentes', '[]'::jsonb),
    coalesce(dados->'discos', '[]'::jsonb),
    (dados->>'discoTotalBytes')::bigint,
    (dados->>'discoLivreBytes')::bigint,
    coalesce(dados->'gpus', '[]'::jsonb),
    coalesce(dados->'adaptadoresRede', '[]'::jsonb),
    coalesce(dados->'softwares', '[]'::jsonb),
    dados->>'rustdeskId',
    (dados->>'rustdeskInstalado')::boolean,
    dados->>'agenteVersao',
    now()
  )
  on conflict (machine_uid) do update set
    hostname = excluded.hostname,
    dominio = excluded.dominio,
    usuario_logado = excluded.usuario_logado,
    fabricante = excluded.fabricante,
    modelo = excluded.modelo,
    numero_serie = excluded.numero_serie,
    tipo_chassi = excluded.tipo_chassi,
    so_nome = excluded.so_nome,
    so_versao = excluded.so_versao,
    so_build = excluded.so_build,
    so_arquitetura = excluded.so_arquitetura,
    so_instalado_em = excluded.so_instalado_em,
    cpu_modelo = excluded.cpu_modelo,
    cpu_fabricante = excluded.cpu_fabricante,
    cpu_nucleos = excluded.cpu_nucleos,
    cpu_threads = excluded.cpu_threads,
    cpu_clock_mhz = excluded.cpu_clock_mhz,
    ram_total_bytes = excluded.ram_total_bytes,
    ram_slots_usados = excluded.ram_slots_usados,
    ram_slots_totais = excluded.ram_slots_totais,
    ram_pentes = excluded.ram_pentes,
    discos = excluded.discos,
    disco_total_bytes = excluded.disco_total_bytes,
    disco_livre_bytes = excluded.disco_livre_bytes,
    gpus = excluded.gpus,
    adaptadores_rede = excluded.adaptadores_rede,
    softwares = excluded.softwares,
    -- Ver o comentário acima sobre agentes em versões diferentes.
    rustdesk_id = coalesce(excluded.rustdesk_id, host_inventory.rustdesk_id),
    rustdesk_instalado = coalesce(excluded.rustdesk_instalado, host_inventory.rustdesk_instalado),
    agente_versao = excluded.agente_versao,
    coletado_em = now();
    -- criado_em NÃO entra no update, de propósito (ver 0008).
end $fn$;

grant execute on function public.upsert_host_inventory(jsonb) to authenticated;
