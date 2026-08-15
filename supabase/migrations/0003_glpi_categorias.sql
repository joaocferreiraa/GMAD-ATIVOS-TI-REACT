-- Renomeia as categorias antigas para a hierarquia "Área > Assunto" do GLPI
-- (ver TICKET_CATEGORIES em src/config/itConfig.js).
--
-- SÓ É NECESSÁRIO se já existirem chamados gravados com os rótulos antigos.
-- Em base nova não faz nada — os UPDATEs simplesmente não encontram linhas.
--
-- Os status NÃO mudaram de valor: 'aberto', 'aguardando_usuario' e
-- 'resolvido' continuam os mesmos no banco; o que virou "Novo", "Pendente" e
-- "Solucionado" é só o rótulo exibido na interface. Por isso não há UPDATE de
-- status aqui, e o CHECK constraint da tabela segue valendo sem alteração.
--
-- COMO RODAR: cole no SQL Editor do Supabase e execute. Idempotente.

update public.helpdesk_tickets set categoria = 'Hardware > Computador'    where categoria = 'Hardware';
update public.helpdesk_tickets set categoria = 'Hardware > Impressora'    where categoria = 'Impressora';
update public.helpdesk_tickets set categoria = 'Rede > Acesso à internet' where categoria = 'Rede/Internet';
update public.helpdesk_tickets set categoria = 'Contas > Acesso e senha'  where categoria = 'Acesso/Senha';
update public.helpdesk_tickets set categoria = 'Contas > E-mail'          where categoria = 'E-mail';
update public.helpdesk_tickets set categoria = 'Software > Erro em sistema' where categoria in ('Sistema', 'Software');
