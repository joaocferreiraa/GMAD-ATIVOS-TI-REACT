-- Inventário de hardware/software das máquinas do parque, coletado pelo
-- agente (ver agent/inventory.js). Alimenta a aba "Inventário" do painel.
--
-- POR QUE UMA TABELA SEPARADA de host_metrics:
-- São perguntas diferentes com formatos de dados opostos. `host_metrics` é
-- SÉRIE TEMPORAL — uma linha nova por coleta, para desenhar gráficos ao
-- longo do tempo ("como estava a CPU às 14h?"). Esta é um CADASTRO — UMA
-- linha por máquina, sobrescrita a cada coleta ("o que essa máquina tem
-- hoje?"). Guardar inventário como série temporal geraria 60+ linhas
-- idênticas por dia só para registrar que nada mudou.
--
-- POR QUE NÃO NO kv_store (como Ativos/Estoque/Contatos):
-- O kv_store guarda a lista inteira de um módulo como UM blob JSON sob uma
-- única chave, e toda gravação reescreve o blob completo com
-- compare-and-swap (ver src/services/supabase/kvStore.js). Isso funciona
-- quando quem escreve é uma pessoa por vez na tela. Aqui são 60+ agentes
-- gravando de forma independente, muitos ao mesmo tempo no início do
-- expediente: cada um reescrevendo a lista inteira brigaria por
-- compare-and-swap com todos os outros, e a maioria das coletas falharia
-- com KvConflictError. Com uma tabela relacional, cada agente faz upsert
-- só da PRÓPRIA linha — não há concorrência entre máquinas diferentes.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase
-- (https://app.supabase.com/project/_/sql) e execute. Idempotente — pode
-- rodar de novo sem duplicar nada.

create table if not exists public.host_inventory (
  -- Chave: UUID de hardware (Win32_ComputerSystemProduct.UUID), gravado na
  -- placa-mãe pelo fabricante. NÃO usamos o hostname como chave: renomear
  -- um PC é operação corriqueira de TI e criaria uma máquina "nova"
  -- duplicada, perdendo o vínculo com o ativo cadastrado. O UUID sobrevive
  -- a rename, reinstalação do Windows e troca de disco.
  machine_uid text primary key,

  -- Identificação
  hostname text not null,
  dominio text,            -- domínio AD ou workgroup
  usuario_logado text,     -- último usuário visto pelo agente (DOMINIO\usuario)
  fabricante text,
  modelo text,
  numero_serie text,       -- service tag / serial do BIOS — é por aqui que
                           -- o painel casa a máquina com o ativo cadastrado
                           -- (campo `serial` em gmad_ativos_data).
  tipo_chassi text,        -- Desktop | Notebook | Servidor | Outro

  -- Sistema operacional
  so_nome text,
  so_versao text,
  so_build text,
  so_arquitetura text,
  so_instalado_em timestamptz,

  -- Processador
  cpu_modelo text,
  cpu_fabricante text,
  cpu_nucleos integer,
  cpu_threads integer,
  cpu_clock_mhz integer,

  -- Memória: total + detalhe dos pentes (jsonb), que é o que responde
  -- "dá pra fazer upgrade?" — slots livres, capacidade e velocidade por
  -- pente. Array de objetos: [{ slot, capacidadeBytes, velocidadeMhz,
  -- fabricante, tipo }].
  ram_total_bytes bigint,
  ram_slots_usados integer,
  ram_slots_totais integer,
  ram_pentes jsonb not null default '[]'::jsonb,

  -- Discos físicos: [{ modelo, tipoMidia, tamanhoBytes, saude, interface }].
  -- tipoMidia distingue SSD de HDD, que é o dado mais pedido na hora de
  -- decidir troca de máquina.
  discos jsonb not null default '[]'::jsonb,
  disco_total_bytes bigint,
  disco_livre_bytes bigint,

  -- Vídeo, rede e software instalado — todos jsonb pela mesma razão:
  -- quantidade variável por máquina.
  gpus jsonb not null default '[]'::jsonb,             -- [{ modelo, memoriaBytes, driver }]
  adaptadores_rede jsonb not null default '[]'::jsonb, -- [{ nome, mac, ips[], velocidadeMbps }]
  softwares jsonb not null default '[]'::jsonb,        -- [{ nome, versao, fabricante }]

  -- Metadados da coleta
  agente_versao text,
  coletado_em timestamptz not null default now(),
  criado_em timestamptz not null default now()
);

-- Busca por hostname (a forma como as pessoas procuram a máquina no painel)
-- e por número de série (usado pra casar com o ativo cadastrado).
create index if not exists host_inventory_hostname_idx
  on public.host_inventory (hostname);

create index if not exists host_inventory_serie_idx
  on public.host_inventory (numero_serie);

-- Ordenação padrão da tela: máquinas que reportaram mais recentemente
-- primeiro (e revela na hora quem parou de reportar).
create index if not exists host_inventory_coletado_idx
  on public.host_inventory (coletado_em desc);

-- RLS: mesma postura do resto do banco — qualquer sessão autenticada
-- (equipe de TI e a conta do agente) lê e grava.
alter table public.host_inventory enable row level security;

drop policy if exists "authenticated read/write host inventory" on public.host_inventory;
create policy "authenticated read/write host inventory"
  on public.host_inventory
  for all
  to authenticated
  using (true)
  with check (true);

-- Realtime: o painel assina as mudanças pra atualizar sozinho quando um
-- agente reporta, sem precisar dar F5.
--
-- Inclui UPDATE além de INSERT (diferente de host_metrics, que só recebe
-- INSERT): aqui a coleta de uma máquina JÁ CADASTRADA é um UPDATE do
-- upsert. Sem isso, só a primeira coleta de cada máquina apareceria ao
-- vivo, e todas as seguintes ficariam invisíveis até o refresh.
do $realtime$
begin
  alter publication supabase_realtime add table public.host_inventory;
exception
  when duplicate_object then null;
end $realtime$;

-- REPLICA IDENTITY FULL: sem isso o Postgres só publica a chave primária
-- nos eventos de UPDATE, e o payload do Realtime chega sem as colunas
-- alteradas. Não é problema pro nosso uso (o painel invalida a query e
-- rebusca, não lê o payload), mas garante que um filtro por coluna no
-- Realtime funcione se alguém precisar depois.
alter table public.host_inventory replica identity full;

-- ---------------------------------------------------------------------------
-- Upsert do agente. Uma função (em vez de o agente montar o upsert direto)
-- porque:
--   1. `criado_em` precisa ser preservado na atualização — um upsert cru
--      sobrescreveria a data do primeiro cadastro a cada coleta, perdendo
--      "desde quando essa máquina existe no parque".
--   2. Deixa o contrato explícito num lugar só, em vez de espalhado no
--      código do agente instalado em 60+ máquinas (que atualiza mais devagar
--      que o banco).
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
    adaptadores_rede, softwares, agente_versao, coletado_em
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
    agente_versao = excluded.agente_versao,
    coletado_em = now();
    -- criado_em NÃO entra no update, de propósito (ver comentário acima).
end $fn$;

grant execute on function public.upsert_host_inventory(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- Remoção de máquinas fora do parque (PC desativado/vendido). NÃO é
-- agendada: diferente das séries temporais, aqui cada linha é uma máquina
-- real e apagar por idade automaticamente sumiria com um PC que só ficou
-- semanas desligado (férias coletivas, máquina de reserva). O painel
-- destaca quem não reporta há muito tempo; a exclusão é decisão humana.
--   select public.remover_host_inventory('UUID-DA-MAQUINA');
-- ---------------------------------------------------------------------------
create or replace function public.remover_host_inventory(p_machine_uid text)
returns void
language sql
as $del$
  delete from public.host_inventory where machine_uid = p_machine_uid;
$del$;

grant execute on function public.remover_host_inventory(text) to authenticated;
