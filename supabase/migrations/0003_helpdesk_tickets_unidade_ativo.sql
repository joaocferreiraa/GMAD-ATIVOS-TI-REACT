-- Chamados: unidade e equipamento relacionado.
--
-- O formulário "Novo chamado" (TicketFormModal.jsx) sempre teve os campos
-- "Unidade" e "Equipamento relacionado", mas createTicket() nunca recebia
-- esses valores e a tabela não tinha onde guardá-los — os dois ficavam
-- sempre em branco no registro final, mesmo quando preenchidos na tela.
--
-- `unidade` é texto solto (não FK), igual a `setor`/`local`: unidade neste
-- sistema não é uma tabela própria, é só o texto livre já usado em
-- ativos/estoque/wifi (ver utils/units.js). `ativo_id` também é referência
-- solta, mesmo padrão de solicitante/responsavel — sem FK para
-- public.ativos porque os ativos vivem no kv_store, não numa tabela SQL.
--
-- COMO RODAR: cole este arquivo inteiro no SQL Editor do Supabase
-- (https://app.supabase.com/project/_/sql) e execute. Idempotente — pode
-- rodar de novo sem duplicar nada.

alter table public.helpdesk_tickets
  add column if not exists unidade text,
  add column if not exists ativo_id text;
