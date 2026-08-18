# Instala o agente de INVENTÁRIO numa máquina do parque.
#
# Pensado para rodar sem ninguém na frente (GPO de logon de máquina, script
# de deploy, ou executado à mão numa máquina só). É idempotente: rodar de
# novo atualiza os arquivos e recria a tarefa, sem duplicar nada.
#
# Uso (PowerShell como administrador):
#   .\instalar-inventario.ps1 -Origem "\\servidor\deploy\gmad-inventario"
#
# Ver README-INVENTARIO.md para o passo a passo completo, inclusive GPO.

[CmdletBinding()]
param(
    # Pasta onde estão os arquivos do agente (inventario.js, inventory.js,
    # package.json e o .env já preenchido). Normalmente um compartilhamento
    # de rede somente-leitura.
    [Parameter(Mandatory = $true)]
    [string]$Origem,

    # Onde instalar na máquina local.
    [string]$Destino = "$env:ProgramData\GMAD\inventario",

    # Nome da tarefa agendada.
    [string]$NomeTarefa = 'GMAD - Inventario de TI',

    # Hora da coleta diária (formato HH:mm).
    [string]$HoraDiaria = '12:00'
)

$ErrorActionPreference = 'Stop'

function Escrever($msg) { Write-Host "[inventario] $msg" }

# --- 1. Node.js -----------------------------------------------------------
# O agente precisa de Node 18+. Não instalamos o Node aqui de propósito:
# distribuir runtime é trabalho do pacote de software da empresa (Intune,
# WSUS, Chocolatey), e um script de logon baixando instalador da internet em
# 60 máquinas é exatamente o tipo de coisa que derruba a rede numa
# segunda-feira de manhã.
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    throw "Node.js não encontrado nesta máquina. Instale o Node 18+ (LTS) antes de rodar este script."
}

$versao = (& node --version) -replace '^v', ''
$maior = [int]($versao -split '\.')[0]
if ($maior -lt 18) {
    throw "Node.js $versao é antigo demais. O agente precisa da versão 18 ou superior."
}
Escrever "Node.js $versao encontrado."

# --- 2. Copiar os arquivos ------------------------------------------------
if (-not (Test-Path $Origem)) {
    throw "Pasta de origem não encontrada: $Origem"
}

if (-not (Test-Path $Destino)) {
    New-Item -ItemType Directory -Path $Destino -Force | Out-Null
}

# Só os arquivos do inventário: index.js/hostMetrics.js são do agente de
# REDE, que roda num servidor só e não tem o que fazer numa estação.
$arquivos = @('inventario.js', 'inventory.js', 'package.json', '.env')
foreach ($arquivo in $arquivos) {
    $caminho = Join-Path $Origem $arquivo
    if (-not (Test-Path $caminho)) {
        throw "Arquivo obrigatório ausente na origem: $arquivo"
    }
    Copy-Item $caminho -Destination $Destino -Force
}
Escrever "Arquivos copiados para $Destino."

# --- 3. Proteger o .env ---------------------------------------------------
# O .env carrega a senha da conta do agente. Numa estação de trabalho,
# qualquer usuário logado poderia lê-la com a herança de permissões padrão
# do ProgramData. Aqui a ACL é reescrita para SYSTEM e Administradores
# apenas — a tarefa roda como SYSTEM, então o agente continua funcionando e
# o usuário da máquina não enxerga a credencial.
$envPath = Join-Path $Destino '.env'
$acl = New-Object System.Security.AccessControl.FileSecurity
$acl.SetAccessRuleProtection($true, $false)   # corta a herança
foreach ($conta in @('NT AUTHORITY\SYSTEM', 'BUILTIN\Administrators')) {
    $acl.AddAccessRule((New-Object System.Security.AccessControl.FileSystemAccessRule(
        $conta, 'FullControl', 'Allow')))
}
Set-Acl -Path $envPath -AclObject $acl
Escrever 'Permissões do .env restritas a SYSTEM e Administradores.'

# --- 4. Dependências ------------------------------------------------------
# npm install em 60 máquinas contra o registry público é lento e falha em
# rede ruim. Se a origem já trouxer node_modules pronto, copiamos.
$nodeModulesOrigem = Join-Path $Origem 'node_modules'
if (Test-Path $nodeModulesOrigem) {
    Copy-Item $nodeModulesOrigem -Destination $Destino -Recurse -Force
    Escrever 'Dependências copiadas da origem.'
}
else {
    Escrever 'Instalando dependências via npm (pode demorar)...'
    Push-Location $Destino
    try { & npm install --omit=dev --no-audit --no-fund | Out-Null }
    finally { Pop-Location }
}

# --- 5. Tarefa agendada ---------------------------------------------------
# Dois gatilhos, complementares:
#   - No logon: pega a máquina assim que alguém começa a usar, o que mantém
#     "usuário logado" atualizado no painel.
#   - Diário: cobre máquina que fica ligada a semana toda sem novo logon.
# O agente sorteia um atraso aleatório antes de coletar (ver
# INVENTARIO_ATRASO_MAXIMO_SEGUNDOS), então 60 máquinas ligando juntas não
# viram um pico simultâneo no Supabase.
$nodeExe = $node.Source
$acao = New-ScheduledTaskAction -Execute $nodeExe -Argument 'inventario.js' -WorkingDirectory $Destino

$gatilhoLogon = New-ScheduledTaskTrigger -AtLogOn
$gatilhoDiario = New-ScheduledTaskTrigger -Daily -At $HoraDiaria

# SYSTEM: a coleta lê WMI e o registro de software da máquina inteira, e a
# tarefa precisa rodar mesmo sem ninguém logado.
$principal = New-ScheduledTaskPrincipal -UserId 'NT AUTHORITY\SYSTEM' -LogonType ServiceAccount -RunLevel Highest

$config = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Minutes 30) `
    -MultipleInstances IgnoreNew

# Unregister antes de registrar: -Force sozinho falha quando a tarefa
# existente foi criada com outro principal.
if (Get-ScheduledTask -TaskName $NomeTarefa -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $NomeTarefa -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $NomeTarefa `
    -Action $acao `
    -Trigger @($gatilhoLogon, $gatilhoDiario) `
    -Principal $principal `
    -Settings $config `
    -Description 'Coleta o inventário de hardware/software desta máquina e envia ao Painel de TI da GMAD.' | Out-Null

Escrever "Tarefa agendada '$NomeTarefa' criada (logon + diária às $HoraDiaria)."

# --- 6. Primeira coleta ---------------------------------------------------
# Roda agora pra a máquina já aparecer no painel, em vez de esperar o
# próximo logon. INVENTARIO_SEM_ATRASO pula o atraso aleatório: aqui é uma
# máquina só, não o rebanho inteiro.
Escrever 'Executando a primeira coleta...'
Start-ScheduledTask -TaskName $NomeTarefa
Escrever 'Instalação concluída. A máquina deve aparecer no painel em instantes.'
