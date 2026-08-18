-- Histórico de mudanças do inventário: registra QUANDO cada máquina mudou
-- de hardware, software ou dono.
--
-- POR QUE ISSO EXISTE:
-- host_inventory guarda o estado ATUAL (uma linha por máquina, sobrescrita
-- a cada coleta). Isso responde "o que essa máquina tem hoje?", mas apaga
-- "o que ela tinha ontem" — e é justamente a diferença entre os dois que
-- revela o que ninguém contou ao TI: RAM que caiu de 16 para 8 GB (pente
-- retirado), disco trocado, máquina que mudou de usuário, programa
-- instalado sem autorização.
--
-- Uma coleta que não muda nada NÃO gera linha aqui. Com 60 máquinas
-- reportando diariamente e hardware que quase nunca muda, o volume é
-- baixíssimo — algumas linhas por semana, não por dia.
--
-- COMO RODAR: cole no SQL Editor do Supabase e execute. Idempotente.

create table if not exists public.host_inventory_changes (
  id bigint generated always as identity primary key,

  -- Mesma referência "solta" de host_inventory (sem FK): se a máquina for
  -- removida do inventário, o histórico do que aconteceu com ela continua
  -- valendo — é registro do passado, não ponteiro para o presente.
  machine_uid text not null,
  hostname text not null,

  -- O que mudou. `campo` usa os nomes em camelCase do app (cpuModelo,
  -- ramTotalBytes...) para a tela não precisar de um segundo mapeamento.
  campo text not null,
  valor_anterior text,
  valor_novo text,

  -- Classificação para a tela priorizar sem reinterpretar o campo:
  --   hardware  -> RAM, disco, CPU, placa (pode ser furto ou upgrade)
  --   software  -> programa instalado/removido
  --   sistema   -> SO, build, versão do agente
  --   identidade-> hostname, usuário logado, domínio (máquina trocou de mão)
  tipo text not null check (tipo in ('hardware', 'software', 'sistema', 'identidade')),

  -- Severidade decidida na GRAVAÇÃO, não na leitura: "RAM diminuiu" é
  -- diferente de "RAM aumentou" e só quem compara os dois valores sabe.
  -- Guardar isso pronto evita reinterpretar a regra em cada consulta.
  severidade text not null default 'info' check (severidade in ('info', 'atencao', 'alerta')),

  created_at timestamptz not null default now()
);

create index if not exists host_inventory_changes_maquina_idx
  on public.host_inventory_changes (machine_uid, created_at desc);

-- Consulta principal da tela: "o que mudou no parque ultimamente?"
create index if not exists host_inventory_changes_tempo_idx
  on public.host_inventory_changes (created_at desc);

-- Só o que pede ação: alertas e atenções recentes, sem varrer o resto.
create index if not exists host_inventory_changes_severidade_idx
  on public.host_inventory_changes (severidade, created_at desc)
  where severidade <> 'info';

alter table public.host_inventory_changes enable row level security;

drop policy if exists "authenticated read/write inventory changes" on public.host_inventory_changes;
create policy "authenticated read/write inventory changes"
  on public.host_inventory_changes
  for all
  to authenticated
  using (true)
  with check (true);

do $realtime$
begin
  alter publication supabase_realtime add table public.host_inventory_changes;
exception
  when duplicate_object then null;
end $realtime$;

-- ---------------------------------------------------------------------------
-- Detecção das mudanças, dentro do upsert.
--
-- POR QUE NO BANCO E NÃO NO AGENTE:
-- o agente roda em 60+ máquinas e cada uma só conhece a si mesma — não tem
-- como saber o que foi gravado na coleta anterior sem uma ida extra ao
-- servidor. O banco já tem a linha antiga na mão no momento do upsert. Além
-- disso, a regra fica num lugar só, e não espalhada em 60 instalações que
-- atualizam em ritmos diferentes.
-- ---------------------------------------------------------------------------
create or replace function public.registrar_mudanca_inventario(
  p_machine_uid text,
  p_hostname text,
  p_campo text,
  p_anterior text,
  p_novo text,
  p_tipo text,
  p_severidade text default 'info'
)
returns void
language plpgsql
as $reg$
begin
  -- Primeira coleta da máquina (anterior nulo) não é mudança: é o cadastro
  -- inicial. Sem isso, toda máquina nova geraria uma enxurrada de "mudou de
  -- vazio para X" no dia da instalação do agente.
  if p_anterior is null then return; end if;
  if p_anterior is not distinct from p_novo then return; end if;

  insert into public.host_inventory_changes (
    machine_uid, hostname, campo, valor_anterior, valor_novo, tipo, severidade
  ) values (
    p_machine_uid, p_hostname, p_campo, p_anterior, p_novo, p_tipo, p_severidade
  );
end $reg$;

-- ---------------------------------------------------------------------------
-- Upsert com detecção de mudanças. Substitui a versão de 0009.
-- ---------------------------------------------------------------------------
create or replace function public.upsert_host_inventory(dados jsonb)
returns void
language plpgsql
security invoker
as $fn$
declare
  anterior public.host_inventory%rowtype;
  v_uid text := dados->>'machineUid';
  v_host text := dados->>'hostname';
  sw_antes text[];
  sw_depois text[];
  sw_novo text;
  sw_removido text;
begin
  select * into anterior from public.host_inventory where machine_uid = v_uid;

  -- ---- Hardware -----------------------------------------------------------
  -- RAM e disco: severidade depende da DIREÇÃO. Diminuir é o caso que pede
  -- olhos (pente retirado, disco trocado por menor); aumentar costuma ser
  -- upgrade planejado e entra como informação.
  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'ramTotalBytes',
    anterior.ram_total_bytes::text, dados->>'ramTotalBytes', 'hardware',
    case
      when anterior.ram_total_bytes is not null
       and (dados->>'ramTotalBytes')::bigint < anterior.ram_total_bytes then 'alerta'
      else 'info'
    end);

  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'discoTotalBytes',
    anterior.disco_total_bytes::text, dados->>'discoTotalBytes', 'hardware',
    case
      when anterior.disco_total_bytes is not null
       and (dados->>'discoTotalBytes')::bigint < anterior.disco_total_bytes then 'alerta'
      else 'info'
    end);

  -- Trocar o processador ou a placa significa, na prática, outra máquina
  -- usando a mesma identidade — sempre merece verificação.
  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'cpuModelo', anterior.cpu_modelo, dados->>'cpuModelo', 'hardware', 'alerta');

  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'modelo', anterior.modelo, dados->>'modelo', 'hardware', 'alerta');

  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'numeroSerie', anterior.numero_serie, dados->>'numeroSerie', 'hardware', 'alerta');

  -- ---- Identidade ---------------------------------------------------------
  -- Máquina renomeada ou em outras mãos: não é problema em si, mas explica
  -- por que um ativo "sumiu" da lista ou apareceu duplicado.
  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'hostname', anterior.hostname, v_host, 'identidade', 'atencao');

  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'usuarioLogado', anterior.usuario_logado, dados->>'usuarioLogado',
    'identidade', 'info');

  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'dominio', anterior.dominio, dados->>'dominio', 'identidade', 'atencao');

  -- ---- Sistema ------------------------------------------------------------
  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'soNome', anterior.so_nome, dados->>'soNome', 'sistema', 'atencao');

  perform public.registrar_mudanca_inventario(
    v_uid, v_host, 'soBuild', anterior.so_build, dados->>'soBuild', 'sistema', 'info');

  -- ---- Software -----------------------------------------------------------
  -- Uma linha por programa instalado/removido (não um diff gigante num
  -- campo só), para a tela poder filtrar por programa e o histórico de um
  -- software específico ser consultável.
  if anterior.machine_uid is not null then
    select coalesce(array_agg(s->>'nome'), '{}') into sw_antes
      from jsonb_array_elements(coalesce(anterior.softwares, '[]'::jsonb)) s;
    select coalesce(array_agg(s->>'nome'), '{}') into sw_depois
      from jsonb_array_elements(coalesce(dados->'softwares', '[]'::jsonb)) s;

    foreach sw_novo in array sw_depois loop
      if not (sw_novo = any(sw_antes)) then
        insert into public.host_inventory_changes
          (machine_uid, hostname, campo, valor_anterior, valor_novo, tipo, severidade)
        values (v_uid, v_host, 'software', null, sw_novo, 'software', 'atencao');
      end if;
    end loop;

    foreach sw_removido in array sw_antes loop
      if not (sw_removido = any(sw_depois)) then
        insert into public.host_inventory_changes
          (machine_uid, hostname, campo, valor_anterior, valor_novo, tipo, severidade)
        values (v_uid, v_host, 'software', sw_removido, null, 'software', 'info');
      end if;
    end loop;
  end if;

  -- ---- Grava o estado atual ----------------------------------------------
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
    v_uid, v_host,
    dados->>'dominio', dados->>'usuarioLogado', dados->>'fabricante',
    dados->>'modelo', dados->>'numeroSerie', dados->>'tipoChassi',
    dados->>'soNome', dados->>'soVersao', dados->>'soBuild', dados->>'soArquitetura',
    (dados->>'soInstaladoEm')::timestamptz,
    dados->>'cpuModelo', dados->>'cpuFabricante',
    (dados->>'cpuNucleos')::integer, (dados->>'cpuThreads')::integer,
    (dados->>'cpuClockMhz')::integer, (dados->>'ramTotalBytes')::bigint,
    (dados->>'ramSlotsUsados')::integer, (dados->>'ramSlotsTotais')::integer,
    coalesce(dados->'ramPentes', '[]'::jsonb),
    coalesce(dados->'discos', '[]'::jsonb),
    (dados->>'discoTotalBytes')::bigint, (dados->>'discoLivreBytes')::bigint,
    coalesce(dados->'gpus', '[]'::jsonb),
    coalesce(dados->'adaptadoresRede', '[]'::jsonb),
    coalesce(dados->'softwares', '[]'::jsonb),
    dados->>'rustdeskId', (dados->>'rustdeskInstalado')::boolean,
    dados->>'agenteVersao', now()
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
    rustdesk_id = coalesce(excluded.rustdesk_id, host_inventory.rustdesk_id),
    rustdesk_instalado = coalesce(excluded.rustdesk_instalado, host_inventory.rustdesk_instalado),
    agente_versao = excluded.agente_versao,
    coletado_em = now();
end $fn$;

grant execute on function public.upsert_host_inventory(jsonb) to authenticated;
grant execute on function public.registrar_mudanca_inventario(text, text, text, text, text, text, text) to authenticated;

-- Retenção: mudanças de hardware/identidade são registro histórico com
-- valor duradouro (é o que responde "quando essa máquina trocou de dono?"),
-- então guardamos bem mais tempo que uma série temporal. Chamada manual ou
-- via pg_cron, como as demais cleanup_*.
create or replace function public.cleanup_inventory_changes(retencao_dias integer default 730)
returns void
language sql
as $del$
  delete from public.host_inventory_changes
  where created_at < now() - (retencao_dias || ' days')::interval;
$del$;
