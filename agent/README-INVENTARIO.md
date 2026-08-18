# Agente de Inventário de Máquinas

Coleta as **especificações completas** de cada PC do parque (placa, CPU,
pentes de RAM, discos, GPU, rede, programas instalados) e envia ao painel,
que atualiza sozinho — sem F5 — assim que uma máquina reporta.

Alimenta a tela **Inventário → Máquinas (agente)**.

## Como se diferencia do agente de rede (`index.js`)

São dois programas na mesma pasta, com propósitos distintos:

| | Agente de rede (`index.js`) | Agente de inventário (`inventario.js`) |
|---|---|---|
| Onde roda | **Um** servidor da rede | **Todas** as máquinas do parque |
| Como roda | Serviço 24/7 (NSSM) | Tarefa agendada, encerra ao terminar |
| O que responde | "A rede está de pé?" | "O que essa máquina tem por dentro?" |
| Grava em | `network_measurements`, `host_metrics` | `host_inventory` |

Instalar um **não** requer o outro. Nas estações, só o de inventário.

## Por que uma linha por máquina (e não histórico)

Cada máquina tem **uma única linha** no banco, identificada pelo UUID de
hardware da placa-mãe, atualizada a cada coleta. 60 máquinas = 60 linhas,
para sempre — elas atualizam, não acumulam. Trocou um pente de RAM? Na
próxima coleta a linha reflete a mudança.

O UUID vem do `Win32_ComputerSystemProduct` e sobrevive a renomear a
máquina, reinstalar o Windows e trocar o disco. Por isso não usamos o
hostname como chave: renomear um PC é rotina de TI e criaria uma máquina
"nova" duplicada.

## 1. Preparar o banco (uma vez só)

No SQL Editor do Supabase, rode nesta ordem:

1. `supabase/migrations/0008_host_inventory.sql`
2. `supabase/migrations/0009_host_inventory_acesso_remoto.sql`

Ambas são idempotentes.

## 1-B. Acesso remoto (RustDesk)

O agente também coleta o **ID do RustDesk** de cada máquina, e a ficha no
painel ganha um botão **"Acessar máquina"** que abre a sessão direto — sem
procurar o ID numa planilha. A tabela lista o acesso por máquina, e o filtro
*"Sem acesso remoto"* dá a lista de quem ainda precisa do RustDesk
instalado.

Como funciona: o link usa o esquema `rustdesk://`, registrado no Windows
pelo próprio instalador do RustDesk. Ele abre o aplicativo **local** (o do
técnico) já apontado para a máquina — não é sessão no navegador, e não
precisa de extensão.

**Requisitos:**

- RustDesk instalado nas máquinas do parque — o instalador `.exe` já o
  instala junto; o agente detecta sozinho.
- RustDesk instalado também na máquina de quem vai acessar.
- Para acesso **desassistido** (sem ninguém aceitar do outro lado),
  configure uma senha fixa no RustDesk da máquina de destino.

Hoje o painel usa o **servidor público do RustDesk**. Para migrar depois
para um servidor próprio (sem mensalidade, sem tráfego passando por
terceiro), basta definir `VITE_RUSTDESK_SERVIDOR` no `.env.local` do painel
— não há mudança de código.

> A senha de acesso **não** entra no link, de propósito: ela ficaria no
> histórico do navegador e em qualquer log de proxy pelo caminho. A
> autenticação acontece no próprio RustDesk.

## 2. Preparar a pasta de distribuição (uma vez só)

Monte um compartilhamento de rede **somente-leitura** para as estações,
por exemplo `\\servidor\deploy$\gmad-inventario`, com:

```
inventario.js
inventory.js
package.json
package-lock.json
.env                  <- credenciais (ver abaixo)
instalar-inventario.ps1
node_modules\          <- opcional, mas recomendado (ver 2.2)
```

### 2.1. O arquivo `.env`

```
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_ANON_KEY=sua-chave-anon-publica
AGENT_EMAIL=agente.inventario@gmad.ti
AGENT_PASSWORD=a-senha-dessa-conta
INVENTARIO_ATRASO_MAXIMO_SEGUNDOS=120
```

> **Use uma conta separada da do agente de rede.** Aquela roda num servidor
> trancado; esta vai para dezenas de estações. Se a credencial do inventário
> vazar, você a revoga no Supabase sem derrubar o monitoramento de rede.
> Crie em Authentication → Users → Add user.

**Sobre a senha nas estações:** o `.env` fica em `%ProgramData%\GMAD\
inventario`, e o instalador restringe a leitura a SYSTEM e Administradores
(a tarefa roda como SYSTEM). Ainda assim, quem tiver **administrador local**
na própria máquina consegue lê-la. É a limitação real de distribuir
credencial para estações — por isso a conta separada, com permissão apenas
de escrever inventário via RLS, e nada mais.

### 2.2. `node_modules` na origem (recomendado)

Rode uma vez na pasta de distribuição:

```powershell
npm install --omit=dev
```

Sem isso, cada uma das 60 máquinas baixa as dependências do registry
público na hora da instalação — lento e sujeito a falha em rede ruim. Com a
pasta pronta na origem, o instalador só copia.

## 3. Instalar numa máquina

Há dois caminhos. **Prefira os instaladores** (`msi/README.md`): eles
desinstalam pelo Painel de Controle, atualizam por versão e aparecem em
"Programas instalados" — o que faz o próprio agente reportar em quais
máquinas ele está e em que versão.

- **`.exe`** (~53 MB) — instala o Node.js **e o RustDesk** junto, se
  faltarem. Máquina recém-formatada sai pronta: inventariada e acessível
  remotamente, sem preparo nem internet. Há variante sem RustDesk (~30 MB)
  para servidores.
- **`.msi`** (~1,8 MB) — exige Node pré-instalado, mas é o único formato
  que a GPO de Instalação de Software aceita.

O script PowerShell abaixo continua valendo para uma máquina ou outra, ou
quando você não quiser compilar nada.

### 3.1. Pelo script PowerShell

PowerShell **como administrador**:

```powershell
\\servidor\deploy$\gmad-inventario\instalar-inventario.ps1 -Origem "\\servidor\deploy$\gmad-inventario"
```

O script verifica o Node, copia os arquivos, restringe as permissões do
`.env`, cria a tarefa agendada e dispara a primeira coleta. É idempotente —
rodar de novo atualiza a instalação.

**Pré-requisito:** Node.js 18+ instalado. O script não instala o Node de
propósito — distribuir runtime é trabalho do seu pacote de software
(Intune, Chocolatey, WSUS); 60 máquinas baixando instalador da internet ao
mesmo tempo é o tipo de coisa que derruba a rede numa segunda de manhã.

## 4. Instalar em escala (GPO)

**Caminho recomendado: o `.msi`.** Ver `msi/README.md` — o Windows instala,
atualiza e desinstala sozinho, via *Configuração do Computador → Políticas →
Configurações de Software → Instalação de software*. (Essa GPO não aceita
`.exe`; para o instalador completo, use Intune/SCCM ou um script de
inicialização chamando-o com `/quiet`.)

O que segue é a alternativa com script, para quem preferir não compilar o
pacote: um **script de inicialização de computador** (roda como SYSTEM, sem
interação):

1. `gpmc.msc` → nova GPO na OU das estações.
2. **Configuração do Computador → Políticas → Configurações do Windows →
   Scripts → Inicialização**.
3. Adicione um `.ps1` com uma linha:

   ```powershell
   & "\\servidor\deploy$\gmad-inventario\instalar-inventario.ps1" -Origem "\\servidor\deploy$\gmad-inventario"
   ```

4. Dê ao grupo **Computadores do Domínio** permissão de leitura no
   compartilhamento — o script roda como a **conta de máquina**
   (`DOMINIO\PC$`), não como o usuário.

As máquinas aparecem no painel conforme forem reiniciando.

## 5. Quando a coleta acontece

Dois gatilhos: **no logon** de qualquer usuário e **diariamente às 12:00**
(ajustável com `-HoraDiaria`). O segundo cobre a máquina que fica ligada a
semana toda sem novo logon.

Cada máquina espera um tempo **aleatório** de até 2 minutos antes de
coletar (`INVENTARIO_ATRASO_MAXIMO_SEGUNDOS`). Sem isso, 60 estações ligando
às 8h bateriam no Supabase praticamente juntas.

A coleta leva ~7 segundos e roda em segundo plano, sem janela.

## 6. Testar e diagnosticar

Ver o que seria coletado, **sem gravar nada**:

```powershell
cd C:\ProgramData\GMAD\inventario
node inventario.js --dry-run
```

Forçar uma coleta real agora:

```powershell
Start-ScheduledTask -TaskName 'GMAD - Inventario de TI'
```

Ver se a última execução deu certo (`0` = sucesso):

```powershell
Get-ScheduledTaskInfo -TaskName 'GMAD - Inventario de TI' |
  Select-Object LastRunTime, LastTaskResult
```

Descobrir quais máquinas do parque **pararam de reportar**: no painel,
filtre por *"Sem reportar há 7+ dias"*. É como se acha agente quebrado,
máquina desligada ou PC que saiu do parque sem baixa.

## 6-B. Atualizar o agente em todo o parque

O agente **se atualiza sozinho**. Depois de corrigir algo em
`inventory.js`, suba a versão em `AGENTE_VERSAO` e publique uma vez:

```powershell
cd agent
node publicar.js
```

Cada máquina compara sua versão na coleta seguinte, baixa a nova e passa a
usá-la a partir da execução posterior. Em até 24h o parque inteiro está
atualizado, sem passar em PC nenhum.

Acompanhe o rollout:

```powershell
node publicar.js --status
```

Mostra a versão publicada, quantas máquinas estão em cada versão e quais
ainda faltam.

Se uma versão publicada se revelar problemática, o freio é:

```powershell
node publicar.js --remover
```

As máquinas param de atualizar e ficam na versão que já têm.

**O que o auto-update NÃO faz:** trocar Node, RustDesk ou a tarefa
agendada. Só os arquivos `.js` do agente. Mexer em runtime e agendamento é
trabalho do instalador, que roda com um humano por perto — um agente que se
reconfigura sozinho pode se desligar sozinho sem ninguém saber.

**Sobre segurança:** isto é, por construção, execução remota de código —
quem escrever na chave `gmad_agente_inventario_release` do `kv_store` roda
o que quiser como SYSTEM em todas as máquinas. O agente recusa pacotes
malformados (nome de arquivo fora da lista permitida, caminho com `..`,
conteúdo que não é módulo ESM, arquivo acima de 512 KB), mas a proteção
real é o RLS do Supabase: só sessão autenticada escreve ali. Trate essa
chave com o mesmo cuidado da senha do agente.

## 7. Desinstalar

```powershell
Unregister-ScheduledTask -TaskName 'GMAD - Inventario de TI' -Confirm:$false
Remove-Item C:\ProgramData\GMAD\inventario -Recurse -Force
```

A máquina continua aparecendo no painel (o registro é histórico) até você
removê-la pela ficha, em **Remover do inventário**.

## 8. Limitações conhecidas

- **Só Windows.** A coleta usa CIM/WMI. Rodar em Linux/macOS falha com
  mensagem explícita, sem gravar nada.
- **Máquina desligada não reporta.** Nada é preenchido com estimativa
  depois — a tela mostra há quanto tempo cada uma reportou pela última vez.
- **Sem telemetria contínua.** Este agente levanta a ficha técnica, não
  acompanha CPU/memória ao longo do tempo. Isso é o agente de rede
  (`index.js`) fazendo `host_metrics`, e só no servidor onde ele roda.
- **VMs podem não ter UUID de hardware.** Quando o SMBIOS vem zerado, o
  agente cai para o número de série e, em último caso, para o hostname
  (visível na ficha como `serie:` ou `host:`). Só nesse caso renomear a
  máquina cria um registro novo.
- **Programas instalados vêm do registro**, a mesma fonte do "Programas e
  Recursos" — incluindo os instalados **por usuário** (VS Code, Figma,
  Notion, navegadores), que ficam no perfil de cada pessoa e não em HKLM.
  Aplicativos da Microsoft Store continuam fora: usam outro mecanismo de
  registro.
- **O ID do RustDesk é lido do executável**, não do arquivo de configuração
  (que guarda o ID criptografado, em `enc_id`). Numa versão do RustDesk sem
  suporte a `--get-id`, a máquina aparece como "Sem ID" — instalado, mas sem
  o número.
