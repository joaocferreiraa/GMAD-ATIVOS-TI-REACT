# Instala o agente de monitoramento como serviço do Windows, via NSSM.
# Automatiza os passos 4.3 a 4.6 do README.md — rode num PowerShell
# ABERTO COMO ADMINISTRADOR, de dentro da pasta do agente:
#
#   .\instalar-servico-windows.ps1 -NssmPath C:\nssm\win64\nssm.exe
#
# Idempotente: rodar de novo com o serviço já instalado atualiza a
# configuração em vez de duplicar o serviço.

[CmdletBinding()]
param(
    # Caminho do nssm.exe (baixe em https://nssm.cc/download e extraia).
    [Parameter(Mandatory = $true)]
    [string]$NssmPath,

    [string]$ServiceName = 'GmadMonitorAgent',

    # Pasta onde este script está — por padrão, a própria pasta do agente.
    [string]$AgentDir = $PSScriptRoot,

    [string]$NodePath = 'C:\Program Files\nodejs\node.exe'
)

$ErrorActionPreference = 'Stop'

function Assert-Ok($condition, $message) {
    if (-not $condition) {
        Write-Host "ERRO: $message" -ForegroundColor Red
        exit 1
    }
}

Write-Host "== Agente de Monitoramento GMAD - instalacao do servico ==" -ForegroundColor Cyan

# --- Verificacoes previas -------------------------------------------------
# Sem privilegio de administrador o NSSM falha so na hora de criar o
# servico, depois de ja ter rodado o npm install — melhor barrar antes.
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()
).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Assert-Ok $isAdmin "abra o PowerShell como Administrador e rode de novo."

Assert-Ok (Test-Path $NssmPath) "nssm.exe nao encontrado em '$NssmPath'. Baixe em https://nssm.cc/download."
Assert-Ok (Test-Path $NodePath) "node.exe nao encontrado em '$NodePath'. Instale o Node.js LTS (https://nodejs.org) ou passe -NodePath."
Assert-Ok (Test-Path (Join-Path $AgentDir 'index.js')) "index.js nao encontrado em '$AgentDir'."

# O .env nao vai pro git de proposito (contem credenciais), entao e o
# esquecimento mais provavel de quem esta montando o servidor.
$envFile = Join-Path $AgentDir '.env'
Assert-Ok (Test-Path $envFile) @"
arquivo .env nao encontrado em '$AgentDir'.
Crie com SUPABASE_URL, SUPABASE_ANON_KEY, AGENT_EMAIL e AGENT_PASSWORD
(ver secao 4.4 do README.md).
"@

Write-Host "Node:  $NodePath"
Write-Host "Pasta: $AgentDir"

# --- Dependencias ---------------------------------------------------------
Write-Host "`n-- Instalando dependencias (npm install --omit=dev)..." -ForegroundColor Cyan
Push-Location $AgentDir
try {
    & npm install --omit=dev
    Assert-Ok ($LASTEXITCODE -eq 0) "npm install falhou (codigo $LASTEXITCODE)."
}
finally {
    Pop-Location
}

# --- Teste de fumaca ------------------------------------------------------
# Roda o agente por alguns segundos ANTES de virar servico: credencial
# errada ou rede bloqueada aparece aqui como mensagem legivel, em vez de
# um servico que reinicia em silencio.
Write-Host "`n-- Testando o agente (10s)..." -ForegroundColor Cyan
$log = Join-Path $env:TEMP "gmad-agente-teste.log"
$proc = Start-Process -FilePath $NodePath -ArgumentList 'index.js' -WorkingDirectory $AgentDir `
    -RedirectStandardOutput $log -RedirectStandardError "$log.err" -PassThru -NoNewWindow
Start-Sleep -Seconds 10
if (-not $proc.HasExited) { $proc.Kill() }

$saida = ((Get-Content $log -Raw -ErrorAction SilentlyContinue) + `
          (Get-Content "$log.err" -Raw -ErrorAction SilentlyContinue))
Remove-Item $log, "$log.err" -ErrorAction SilentlyContinue

if ($saida -match '\[agente\] autenticado') {
    Write-Host "OK: autenticou no Supabase." -ForegroundColor Green
    ($saida -split "`n" | Select-Object -First 6) | ForEach-Object { Write-Host "   $_" }
}
else {
    Write-Host "O teste nao autenticou. Saida do agente:" -ForegroundColor Red
    Write-Host $saida
    Write-Host "Corrija o .env (secao 4.4 do README) e rode este script de novo." -ForegroundColor Red
    exit 1
}

# --- Servico --------------------------------------------------------------
$existente = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existente) {
    Write-Host "`n-- Servico '$ServiceName' ja existe; parando pra reconfigurar..." -ForegroundColor Yellow
    & $NssmPath stop $ServiceName | Out-Null
}
else {
    Write-Host "`n-- Criando servico '$ServiceName'..." -ForegroundColor Cyan
    & $NssmPath install $ServiceName $NodePath (Join-Path $AgentDir 'index.js')
    Assert-Ok ($LASTEXITCODE -eq 0) "nssm install falhou (codigo $LASTEXITCODE)."
}

$logFile = Join-Path $AgentDir 'agente.log'
& $NssmPath set $ServiceName AppDirectory $AgentDir           | Out-Null
& $NssmPath set $ServiceName Start SERVICE_AUTO_START         | Out-Null
& $NssmPath set $ServiceName AppStdout $logFile               | Out-Null
& $NssmPath set $ServiceName AppStderr $logFile               | Out-Null
& $NssmPath set $ServiceName AppRotateFiles 1                 | Out-Null
& $NssmPath set $ServiceName AppRotateBytes 10485760          | Out-Null
# Espera 15s antes de reiniciar: quando o servidor liga e a rede ainda nao
# subiu, o login falha e o agente sai com exit(1) de proposito. Sem essa
# pausa o servico entraria num ciclo rapido de reinicio ate a rede voltar.
& $NssmPath set $ServiceName AppRestartDelay 15000            | Out-Null

Write-Host "-- Iniciando..." -ForegroundColor Cyan
& $NssmPath start $ServiceName | Out-Null
Start-Sleep -Seconds 5

$svc = Get-Service -Name $ServiceName
Write-Host "`nServico '$ServiceName': $($svc.Status)" -ForegroundColor Green
Write-Host @"

Pronto. Comandos uteis:
  Get-Content '$logFile' -Tail 20 -Wait     # acompanhar o log
  & '$NssmPath' restart $ServiceName        # apos editar o .env
  & '$NssmPath' stop $ServiceName
  & '$NssmPath' remove $ServiceName confirm # desinstalar

Confira tambem o painel: Monitoramento de Rede -> "Ultima atualizacao"
deve mostrar poucos segundos atras.
"@ -ForegroundColor Cyan
