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

## 4. Instalar num servidor Windows (passo a passo)

Roteiro completo pra colocar o agente rodando 24/7 num Windows Server.
Todos os caminhos abaixo usam `C:\gmad-monitor` como exemplo — troque pelo
que você preferir.

### 4.1. Copiar os arquivos

Copie a pasta `agent/` do projeto pro servidor (pendrive, compartilhamento
de rede ou SCP), em `C:\gmad-monitor`. Precisa levar:

```
index.js
package.json
package-lock.json
```

**Não copie `node_modules`** (são ~9 MB de dependências que serão baixadas
no próprio servidor no passo 4.3) nem o seu `.env` local — as credenciais
serão configuradas direto no servidor, no passo 4.4.

### 4.2. Instalar o Node.js

Baixe o instalador **LTS** em <https://nodejs.org> e instale (Node 18+;
qualquer LTS atual serve). Confirme abrindo um PowerShell **como
administrador**:

```powershell
node --version
```

### 4.3. Instalar as dependências

```powershell
cd C:\gmad-monitor
npm install --omit=dev
```

### 4.4. Criar o arquivo de credenciais

Crie `C:\gmad-monitor\.env` (sem nome antes do ponto) com este conteúdo,
usando as mesmas `SUPABASE_URL`/`SUPABASE_ANON_KEY` do painel e a conta
dedicada do agente:

```
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-publica
AGENT_EMAIL=agente.monitoramento@gmad.ti
AGENT_PASSWORD=a-senha-dessa-conta
```

> O Bloco de Notas gosta de salvar como `.env.txt`. Salve escolhendo
> "Todos os arquivos" no tipo, ou crie pelo PowerShell com
> `New-Item .env -ItemType File`.

### 4.5. Testar antes de virar serviço

```powershell
cd C:\gmad-monitor
node index.js
```

Deve aparecer `[agente] autenticado como ...` seguido de uma linha por
ponto monitorado. Se aparecer erro de credencial ou de rede, resolva agora
— é bem mais fácil de diagnosticar aqui do que depois, como serviço.
Pare com `Ctrl+C` quando estiver satisfeito.

### 4.6. Instalar como serviço do Windows (NSSM)

Use o [NSSM](https://nssm.cc/download): baixe, extraia, e rode o
`nssm.exe` da pasta `win64` num PowerShell **como administrador**.

```powershell
.\nssm.exe install GmadMonitorAgent "C:\Program Files\nodejs\node.exe" "C:\gmad-monitor\index.js"
.\nssm.exe set GmadMonitorAgent AppDirectory C:\gmad-monitor
.\nssm.exe set GmadMonitorAgent Start SERVICE_AUTO_START
```

Log em arquivo (o agente escreve tudo na saída padrão, que sem isso se
perde quando roda como serviço):

```powershell
.\nssm.exe set GmadMonitorAgent AppStdout C:\gmad-monitor\agente.log
.\nssm.exe set GmadMonitorAgent AppStderr C:\gmad-monitor\agente.log
.\nssm.exe set GmadMonitorAgent AppRotateFiles 1
.\nssm.exe set GmadMonitorAgent AppRotateBytes 10485760
```

Inicie:

```powershell
.\nssm.exe start GmadMonitorAgent
```

**Por que NSSM e não o Agendador de Tarefas:** se a rede ainda não estiver
pronta quando o servidor liga, o login no Supabase falha e o agente
encerra o processo de propósito (`process.exit(1)`, ver `main()` no final
do `index.js`) — é o comportamento certo pra não ficar um processo
zumbi sem sessão. Só que aí ele **não volta sozinho**: o Agendador dispara
a tarefa uma vez no boot e não tenta de novo, então o monitoramento
ficaria parado até alguém reparar. O NSSM reinicia o serviço
automaticamente quando o processo morre, o que cobre esse caso e também
quedas de rede prolongadas.

Falhas pontuais **não** derrubam o agente: se a rede cair com ele já
autenticado, cada gravação falha com um `console.error` e o ciclo seguinte
tenta de novo normalmente (ver `insertMeasurement`).

### 4.7. Verificar que está funcionando

- **No servidor:** `Get-Content C:\gmad-monitor\agente.log -Tail 20`
- **No painel:** abra Monitoramento de Rede — o indicador "Última
  atualização" no topo deve mostrar poucos segundos atrás.

Comandos úteis do serviço:

```powershell
.\nssm.exe restart GmadMonitorAgent   # depois de editar o .env
.\nssm.exe stop GmadMonitorAgent
.\nssm.exe remove GmadMonitorAgent confirm   # desinstalar
```

### 4.8. Requisitos de rede do servidor

- Alcançar por **ICMP (ping)** os IPs cadastrados — se houver segmentação
  de VLAN/firewall entre o servidor e os pontos, libere antes.
- Alcançar `*.supabase.co` por **HTTPS (443)** na saída, pra gravar as
  medições.

> Escolha um servidor que enxergue as mesmas redes que você quer
> monitorar: o agente mede a conectividade **a partir de onde ele roda**.
> Rodando num segmento diferente, os números refletem aquele caminho de
> rede, não o dos usuários.

## 4-B. Alternativa: Linux (systemd)

Se um dia migrar pra Linux, o equivalente do passo 4.6:

```ini
[Unit]
Description=Agente de Monitoramento de Rede - Painel TI GMAD
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=/caminho/para/agent
ExecStart=/usr/bin/node index.js
EnvironmentFile=/caminho/para/agent/.env
# always (não on-failure): cobre também o exit(1) proposital do login
# quando a rede ainda não subiu — mesmo motivo do NSSM no Windows.
Restart=always
RestartSec=15

[Install]
WantedBy=multi-user.target
```

`sudo systemctl enable --now gmad-monitor` pra ativar; logs em
`journalctl -u gmad-monitor -f`.

## 4-C. Atualizar um agente já instalado (métricas de CPU/memória/disco)

O agente passou a coletar também métricas da máquina onde roda (CPU,
memória, disco, uptime), que alimentam a aba **Painel de Infraestrutura**
do painel. Pra habilitar num servidor que já está rodando:

1. **No Supabase**, rode `supabase/migrations/0006_host_metrics.sql` no SQL
   Editor (uma vez só). Sem isso o agente avisa no log e segue coletando
   ping normalmente.
2. **No servidor**, copie o arquivo novo `hostMetrics.js` e o `index.js`
   atualizado pra pasta do agente (ex.: `C:\gmad-monitor`).
3. Acrescente ao `.env` do servidor (opcional — há padrão pra tudo):

   ```
   AGENT_HOST_LABEL=Servidor TI - Madville
   HOST_METRICS_INTERVAL_SEGUNDOS=60
   ```

   `AGENT_HOST_LABEL` é o nome que aparece no painel (sem ele, usa o
   hostname do Windows). `HOST_METRICS_INTERVAL_SEGUNDOS=0` desliga a
   coleta de métricas da máquina, mantendo só o monitoramento de rede.

4. Reinicie o serviço: `.\nssm.exe restart GmadMonitorAgent`

No log deve aparecer uma linha por coleta:
`[agente] host SRV-TI: CPU 12.4% | RAM 63.1% | disco 71%`.

A coleta é leve (uma leitura do SO a cada minuto) e independente do ping —
se ela falhar, o monitoramento de rede continua funcionando.

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
