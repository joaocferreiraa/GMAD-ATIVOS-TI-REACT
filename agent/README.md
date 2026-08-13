# Agente de Monitoramento de Rede

Roda **dentro da rede da GMAD**, faz ping de verdade nos pontos cadastrados
na aba "Monitoramento de Rede" do painel e grava as medições no Supabase.
Necessário porque o painel é hospedado na Vercel, que não tem como alcançar
IPs privados (`192.168.x.x`, `10.x.x.x`...) — só um processo rodando dentro
da própria rede consegue.

## Por que isso existe

O navegador de quem acessa o painel também não consegue: por segurança, sites
não têm permissão de fazer ICMP ping nem, na prática, alcançar IPs privados
arbitrários da rede de quem os visita. Sem esse agente, os pontos do tipo
Servidor/Roteador/Switch (hosts internos) nunca teriam medição real — e o
requisito era não simular esse número.

## 1. Pré-requisitos

- Node.js 18+ instalado numa máquina/servidor **dentro da rede da GMAD**, com
  acesso de rede aos IPs que serão monitorados.
- Uma conta de login no Supabase Auth dedicada ao agente (não uma conta de
  pessoa) — crie em **Authentication → Users → Add user** no painel do
  Supabase, com um e-mail tipo `agente.monitoramento@gmad.ti` e uma senha
  forte. Ela usa a mesma autenticação (e as mesmas políticas de RLS) que
  qualquer login do painel — o agente não tem nenhum privilégio especial além
  de "estar autenticado", igual a qualquer pessoa da equipe.
- As tabelas `network_measurements`/`network_alerts` já criadas — rode
  `supabase/migrations/0001_network_monitoring.sql` no SQL Editor do Supabase
  antes de usar o agente (uma vez só).

## 2. Instalação

```bash
cd agent
npm install
cp .env.example .env
```

Edite `.env` com a URL/chave anônima do mesmo Supabase do painel (as mesmas
de `.env.local` na raiz do projeto) e o e-mail/senha da conta do agente.

## 3. Rodar

```bash
npm start
```

O agente:

1. Faz login no Supabase com a conta configurada.
2. Lê os pontos monitorados cadastrados no painel (os mesmos que aparecem em
   Monitoramento de Rede → "+ Novo ponto").
3. Pra cada ponto ativo, faz ping de verdade no IP/host configurado, no
   intervalo definido naquele ponto.
4. Grava cada medição (disponível/latência/perda de pacotes) no Supabase.
5. Abre um alerta quando um ponto ultrapassa os limites configurados
   (latência, perda de pacotes, falhas consecutivas) e resolve
   automaticamente quando volta ao normal.
6. A cada 5 minutos, relê a lista de pontos — cadastrar/editar/excluir um
   ponto no painel reflete no agente sem precisar reiniciar.

Pare com `Ctrl+C`.

## 4. Rodar em segundo plano / como serviço

Pra deixar rodando de forma permanente (recomendado em produção), use um
gerenciador de processos. Duas opções simples:

**Windows (Agendador de Tarefas)**: crie uma tarefa que execute
`node C:\caminho\para\agent\index.js` ao iniciar o sistema, com "Executar
estando o usuário conectado ou não" marcado.

**Linux (systemd)** — exemplo de unit file:

```ini
[Unit]
Description=Agente de Monitoramento de Rede - Painel TI GMAD
After=network.target

[Service]
Type=simple
WorkingDirectory=/caminho/para/agent
ExecStart=/usr/bin/node index.js
Restart=on-failure
EnvironmentFile=/caminho/para/agent/.env

[Install]
WantedBy=multi-user.target
```

Ou, mais simples em ambos os sistemas: `pm2 start index.js --name monitor-gmad`
(precisa instalar o [PM2](https://pm2.keymetrics.io/) globalmente).

## 5. Limitações conhecidas

- Mede **ping/latência/perda de pacotes** (via `ping` do sistema
  operacional). Não faz teste de velocidade (download/upload) dos pontos —
  isso é feito pelo navegador de quem usa o painel (botão "Executar teste"
  em Monitoramento de Rede), contra os endpoints `/api/speedtest-*` da
  própria Vercel.
- Só monitora o que estiver marcado como "Monitoramento ativo" no cadastro
  do ponto.
- Precisa ficar rodando continuamente pra gerar histórico — se a máquina
  onde ele roda ficar desligada, não há medição nesse período (não é
  preenchido com dado falso depois).
