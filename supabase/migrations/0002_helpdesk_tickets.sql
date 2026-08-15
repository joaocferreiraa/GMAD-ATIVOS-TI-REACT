-- Helpdesk de TI — chamados, comentários e histórico.
--
-- POR QUE TABELAS DE VERDADE E NÃO kv_store:
-- Mesma razão de network_measurements (ver 0001): chamado é dado de escrita
-- frequente e concorrente. Vários técnicos mexendo na fila ao mesmo tempo,
-- mais o bot do WhatsApp gravando comentário a cada mensagem recebida —
-- reescrever um blob JSON inteiro a cada evento perderia atualizações
-- (last-write-wins) e degradaria o kv_store para todos os outros módulos.
-- Comentários e histórico crescem sem limite dentro de um chamado ativo,
-- o que agrava o problema.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase
-- (https://app.supabase.com/project/_/sql) e execute. Idempotente — pode
-- rodar de novo sem duplicar nada.

create table if not exists public.helpdesk_tickets (
  id bigint generated always as identity primary key,
  titulo text not null, -- derivado da primeira frase da descrição quando o chamado vem do WhatsApp (ver ticketsService.tituloDaDescricao)
  descricao text not null,
  status text not null default 'aberto'
    check (status in ('aberto', 'em_atendimento', 'aguardando_usuario', 'resolvido', 'fechado', 'cancelado')),
  prioridade text not null default 'media'
    check (prioridade in ('baixa', 'media', 'alta', 'urgente')),
  categoria text,
  origem text not null default 'painel' check (origem in ('painel', 'whatsapp')),

  -- Solicitante: para chamados do WhatsApp guardamos o telefone (ou o @lid,
  -- identificador interno que o WhatsApp usa no lugar do número em algumas
  -- contas) e o nome do perfil. Para chamados abertos no painel, o e-mail
  -- do usuário logado. Referência "solta", sem FK — mesmo padrão de
  -- pcVinculado/contatoCelularInfo usado no resto do sistema.
  solicitante text,
  solicitante_nome text,
  telefone text, -- só para chamados do WhatsApp; é por aqui que o bot responde

  responsavel text, -- e-mail do técnico atribuído
  responsavel_nome text,

  setor text,
  local text,
  foto_path text, -- caminho do arquivo no servidor do bot (fora do Supabase Storage por enquanto)

  avaliacao smallint check (avaliacao between 1 and 5),
  avaliacao_comentario text,

  sla_prazo timestamptz, -- calculado na criação a partir da prioridade
  resolvido_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists helpdesk_tickets_status_idx
  on public.helpdesk_tickets (status, created_at desc);
create index if not exists helpdesk_tickets_telefone_idx
  on public.helpdesk_tickets (telefone);
create index if not exists helpdesk_tickets_solicitante_idx
  on public.helpdesk_tickets (solicitante);

-- Comentários públicos (visíveis ao solicitante, e repassados ao WhatsApp
-- dele quando o chamado veio de lá) e notas internas (só para a equipe).
create table if not exists public.helpdesk_comments (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.helpdesk_tickets (id) on delete cascade,
  autor text,
  autor_nome text,
  conteudo text not null,
  interno boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists helpdesk_comments_ticket_idx
  on public.helpdesk_comments (ticket_id, created_at);

-- Histórico de mudanças (criação, status, prioridade, atribuição, avaliação).
-- Separado dos comentários porque a timeline mostra os dois juntos mas com
-- formatação diferente — evento é gerado pelo sistema, comentário é texto
-- escrito por alguém.
create table if not exists public.helpdesk_events (
  id bigint generated always as identity primary key,
  ticket_id bigint not null references public.helpdesk_tickets (id) on delete cascade,
  tipo text not null, -- 'criacao' | 'status' | 'prioridade' | 'atribuicao' | 'avaliacao'
  de text,
  para text,
  autor text,
  autor_nome text,
  created_at timestamptz not null default now()
);

create index if not exists helpdesk_events_ticket_idx
  on public.helpdesk_events (ticket_id, created_at);

-- Estado da conversa de cada usuário no WhatsApp. Fica no banco (e não em
-- memória do bot) para que reiniciar o processo não tire ninguém do meio de
-- um atendimento — sem isso o usuário continua respondendo achando que está
-- no chat ao vivo, e o bot devolve o menu.
create table if not exists public.helpdesk_sessions (
  telefone text primary key,
  estado text not null default 'IDLE',
  descricao text,
  ticket_id bigint references public.helpdesk_tickets (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- RLS: mesmo padrão do resto do sistema — o app acessa com a anon key e a
-- autenticação é feita pelo Supabase Auth, então liberamos para usuários
-- autenticados. O bot do WhatsApp usa a service_role key, que ignora RLS.
alter table public.helpdesk_tickets enable row level security;
alter table public.helpdesk_comments enable row level security;
alter table public.helpdesk_events enable row level security;
alter table public.helpdesk_sessions enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'helpdesk_tickets' and policyname = 'authenticated_all') then
    create policy authenticated_all on public.helpdesk_tickets for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'helpdesk_comments' and policyname = 'authenticated_all') then
    create policy authenticated_all on public.helpdesk_comments for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'helpdesk_events' and policyname = 'authenticated_all') then
    create policy authenticated_all on public.helpdesk_events for all to authenticated using (true) with check (true);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'helpdesk_sessions' and policyname = 'authenticated_all') then
    create policy authenticated_all on public.helpdesk_sessions for all to authenticated using (true) with check (true);
  end if;
end $$;

-- Realtime: o painel usa para atualizar a fila sozinho, e o bot do WhatsApp
-- para saber quando um técnico comentou ou mudou o status — é assim que a
-- resposta dada no painel chega ao WhatsApp do solicitante (ver notifier.js
-- no projeto do bot). Sem isso, a ponte painel -> WhatsApp não funciona.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'helpdesk_tickets'
  ) then
    alter publication supabase_realtime add table public.helpdesk_tickets;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'helpdesk_comments'
  ) then
    alter publication supabase_realtime add table public.helpdesk_comments;
  end if;
end $$;

-- UPDATE via Realtime só entrega a linha nova; para o bot saber se o status
-- realmente mudou (e não a prioridade, por exemplo) ele guarda o último
-- status visto em memória. REPLICA IDENTITY FULL passaria a linha antiga
-- junto, mas custa mais WAL — a solução em memória basta aqui.
