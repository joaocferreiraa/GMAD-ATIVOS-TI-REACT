-- Histórico permanente de quem alterou o quê no painel.
--
-- POR QUE ISSO EXISTE:
-- O registro de atividade vivia numa chave do kv_store (gmad_ativos_log)
-- limitada às 40 entradas mais recentes — as antigas eram descartadas a cada
-- gravação. Isso serve para um feed de "o que aconteceu agora há pouco", mas
-- não responde a pergunta que gestão de ativo realmente faz: "quem transferiu
-- este notebook, e quando?". Passadas 40 ações, a resposta não existia mais.
--
-- Como o painel não tem separação de permissão (as três pessoas com acesso
-- podem tudo, decisão consciente para uma equipe desse tamanho), este
-- histórico é a ÚNICA rede de proteção contra exclusão acidental. Daí duas
-- características que o diferenciam das outras tabelas daqui:
--
--   1. É SÓ-ACRÉSCIMO. Não há policy de update nem de delete — com RLS
--      ligada, o que não tem policy é negado. Ninguém apaga o próprio
--      rastro, nem sem querer nem de propósito. É o que separa um histórico
--      de um bloco de rascunho.
--
--   2. Guarda o REGISTRO INTEIRO em `dados` (jsonb), não só a frase do que
--      aconteceu. Excluiu o ativo errado? O conteúdo dele está aqui e dá
--      para recadastrar sem depender de backup.
--
-- VOLUME: sete módulos, dois a três usuários, algumas dezenas de ações por
-- dia no pico. Uma ordem de grandeza abaixo de 20 mil linhas/ano, com
-- registros de poucos KB — não precisa de retenção automática (compare com
-- 0007, onde ~810 mil linhas/ano justificaram agendar limpeza). Apagar
-- histórico de auditoria por idade seria, aliás, contrário ao propósito.
--
-- COMO RODAR: cole no SQL Editor do Supabase e execute. Idempotente.

create table if not exists public.historico_alteracoes (
  id bigint generated always as identity primary key,

  criado_em timestamptz not null default now(),

  -- Nome de exibição de quem fez (o mesmo que aparece na barra lateral, via
  -- nameFromEmail). Texto e não FK para auth.users: se a conta for removida,
  -- o registro do que ela fez continua valendo — é fato do passado, não
  -- ponteiro para o presente. Mesma escolha de host_inventory_changes.
  autor text,

  acao text not null check (acao in ('criar', 'editar', 'excluir')),

  -- Módulo em que aconteceu, no mesmo vocabulário do app (queryKey):
  -- 'ativos', 'contatos', 'estoque', 'instaladores', 'scripts',
  -- 'infraestrutura', 'monitores'. Sem check constraint de propósito —
  -- módulo novo no app não deve precisar de migration para registrar.
  entidade text not null,

  -- uid do registro afetado. É por ele que se monta a linha do tempo de um
  -- ativo específico ("tudo que já aconteceu com esta máquina").
  entidade_uid text,

  -- Identificador legível do registro no momento da ação (hostname, nome,
  -- etiqueta). Guardado junto porque o registro pode ter sido excluído ou
  -- renomeado depois — a tela precisa mostrar o que era NAQUELE momento.
  rotulo text,

  -- Frase pronta, no mesmo formato que a tela "Atividade recente" já exibia
  -- quando isso morava no kv_store. Mantida para os consumidores atuais não
  -- precisarem mudar.
  texto text not null,

  -- Conteúdo do registro no momento da ação. Em 'excluir' é o que existia
  -- antes de sumir — a parte que permite desfazer à mão.
  dados jsonb
);

-- Consulta da tela "Atividade recente": as N mais novas, sem varrer o resto.
create index if not exists historico_alteracoes_tempo_idx
  on public.historico_alteracoes (criado_em desc);

-- Linha do tempo de um registro específico.
create index if not exists historico_alteracoes_registro_idx
  on public.historico_alteracoes (entidade, entidade_uid, criado_em desc);

alter table public.historico_alteracoes enable row level security;

-- Leitura e escrita liberadas a quem está logado, como nas demais tabelas.
-- O que NÃO existe aqui é o ponto: sem policy de update e de delete, o
-- PostgREST recusa as duas mesmo para quem está autenticado. Se algum dia
-- for preciso expurgar algo (dado pessoal, por exemplo), faça pelo SQL
-- Editor com a service_role, que ignora RLS — deliberadamente fora do
-- alcance do app.
drop policy if exists "authenticated read historico" on public.historico_alteracoes;
create policy "authenticated read historico"
  on public.historico_alteracoes
  for select
  to authenticated
  using (true);

drop policy if exists "authenticated insert historico" on public.historico_alteracoes;
create policy "authenticated insert historico"
  on public.historico_alteracoes
  for insert
  to authenticated
  with check (true);

-- ---------------------------------------------------------------------------
-- Traz para cá as até 40 entradas que ainda estiverem no kv_store, para a
-- tela "Atividade recente" não parecer zerada logo depois da migração.
--
-- Só roda com a tabela vazia: reexecutar o arquivo não duplica nada. As
-- entradas antigas não têm ação, módulo nem registro associado (o formato
-- antigo era só {ts, texto, por}) — entram como 'editar'/'importado', que é
-- o mais honesto: sabe-se que algo mudou e quem mudou, não o quê.
-- ---------------------------------------------------------------------------
insert into public.historico_alteracoes (criado_em, autor, acao, entidade, texto, dados)
select
  coalesce((entrada->>'ts')::timestamptz, now()),
  entrada->>'por',
  'editar',
  'importado',
  coalesce(entrada->>'texto', '(sem descrição)'),
  null
from public.kv_store k,
     jsonb_array_elements(k.value) as entrada
where k.key = 'gmad_ativos_log'
  and not exists (select 1 from public.historico_alteracoes);
