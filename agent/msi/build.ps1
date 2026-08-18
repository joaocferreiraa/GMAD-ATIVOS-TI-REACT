# Compila o MSI do Agente de Inventário da GMAD.
#
# Uso (PowerShell, não precisa de administrador):
#   .\build.ps1 -ArquivoEnv "C:\deploy\.env"
#
# Gera: agent\msi\dist\GMAD-Agente-Inventario-<versao>.msi
#
# Ver README.md nesta pasta para o passo a passo completo e o deploy.

[CmdletBinding()]
param(
    # .env com as credenciais, EMBUTIDO no MSI. É o que permite instalar em
    # 60 máquinas sem configurar nada em cada uma.
    [Parameter(Mandatory = $true)]
    [string]$ArquivoEnv,

    # Versão do pacote. Por padrão sai do package.json do agente, pra o
    # número em "Programas e Recursos" bater com o AGENTE_VERSAO reportado
    # ao painel.
    [string]$Versao,

    [string]$SaidaDir = "$PSScriptRoot\dist"
)

$ErrorActionPreference = 'Stop'
$PastaAgente = Split-Path $PSScriptRoot -Parent

function Escrever($msg) { Write-Host "[build] $msg" -ForegroundColor Cyan }

# --- 1. Ferramentas -------------------------------------------------------
# O `dotnet tool install --global` não adiciona o diretório ao PATH da
# sessão atual — só de sessões novas. Sem isto, um build logo após instalar
# o WiX falharia com "wix não reconhecido" mesmo estando instalado.
$toolsDir = Join-Path $env:USERPROFILE '.dotnet\tools'
if (Test-Path $toolsDir -PathType Container) {
    if ($env:PATH -notlike "*$toolsDir*") { $env:PATH = "$env:PATH;$toolsDir" }
}

if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
    throw @"
WiX Toolset não encontrado. Instale com:

    dotnet tool install --global wix --version 5.0.2

(requer .NET SDK — https://dotnet.microsoft.com/download)
"@
}

# util:PermissionEx e util:RemoveFolderEx vêm da extensão Util, que não é
# embutida no wix.exe. `wix extension add` é idempotente.
Escrever 'Garantindo a extensão WixToolset.Util.wixext...'
& wix extension add --global WixToolset.Util.wixext/5.0.2 2>&1 | Out-Null

# --- 2. Validações --------------------------------------------------------
if (-not (Test-Path $ArquivoEnv -PathType Leaf)) {
    throw "Arquivo .env não encontrado: $ArquivoEnv"
}

# Falha cedo e com mensagem clara: um MSI compilado com .env incompleto
# instala normalmente e só falha na primeira coleta, em 60 máquinas ao
# mesmo tempo.
$envTexto = Get-Content $ArquivoEnv -Raw
foreach ($chave in @('SUPABASE_URL', 'SUPABASE_ANON_KEY', 'AGENT_EMAIL', 'AGENT_PASSWORD')) {
    if ($envTexto -notmatch "(?m)^\s*$chave\s*=\s*\S") {
        throw "O arquivo .env não define $chave (ou está vazio). Preencha antes de compilar."
    }
}
if ($envTexto -match 'SEU-PROJETO\.supabase\.co' -or $envTexto -match 'defina-uma-senha') {
    throw "O arquivo .env ainda tem os valores de exemplo. Preencha com as credenciais reais."
}

if (-not $Versao) {
    $pkg = Get-Content (Join-Path $PastaAgente 'package.json') -Raw | ConvertFrom-Json
    $Versao = $pkg.version
}
# O MSI aceita no máximo 4 campos numéricos; sufixos tipo "1.1.0-beta"
# quebram a compilação.
if ($Versao -notmatch '^\d+(\.\d+){0,3}$') {
    throw "Versão inválida para MSI: '$Versao'. Use apenas números, ex.: 1.1.0"
}
Escrever "Versão do pacote: $Versao"

# --- 3. Dependências do agente -------------------------------------------
# node_modules entra no MSI para a máquina de destino não precisar de npm
# nem de acesso ao registry na instalação.
$nodeModules = Join-Path $PastaAgente 'node_modules'
if (-not (Test-Path $nodeModules)) {
    Escrever 'node_modules ausente — instalando dependências de produção...'
    Push-Location $PastaAgente
    try { & npm install --omit=dev --no-audit --no-fund | Out-Null }
    finally { Pop-Location }
}

# --- 4. Harvest do node_modules ------------------------------------------
# São centenas de arquivos; listá-los à mão no .wxs seria inviável e
# quebraria a cada atualização de dependência. `wix build` não faz harvest
# sozinho (isso era o heat.exe do WiX 3), então geramos o fragmento aqui.
#
# Um Component por arquivo, com Guid="*" (o WiX deriva o GUID do caminho de
# destino, estável entre builds) — é a regra do Windows Installer: um
# arquivo por componente evita que a atualização de uma dependência deixe
# arquivo órfão.
Escrever 'Gerando o fragmento de node_modules...'
$sb = [System.Text.StringBuilder]::new()
[void]$sb.AppendLine('<?xml version="1.0" encoding="UTF-8"?>')
[void]$sb.AppendLine('<!-- GERADO POR build.ps1 - NÃO EDITE À MÃO -->')
[void]$sb.AppendLine('<Wix xmlns="http://wixtoolset.org/schemas/v4/wxs">')
[void]$sb.AppendLine('  <Fragment>')
[void]$sb.AppendLine('    <ComponentGroup Id="DependenciasNode">')

$arquivos = Get-ChildItem $nodeModules -Recurse -File
$dirsVistos = @{}
$idx = 0

# Diretórios primeiro: cada arquivo referencia o Directory que o contém, e
# o WiX exige que ele já esteja declarado.
$dirsXml = [System.Text.StringBuilder]::new()
function IdSeguro([string]$caminho) {
    # Ids do MSI aceitam só [A-Za-z0-9_.]; o hash no fim evita colisão
    # entre caminhos diferentes que normalizam para o mesmo texto.
    $limpo = ($caminho -replace '[^A-Za-z0-9_]', '_')
    $hash = [System.BitConverter]::ToString(
        [System.Security.Cryptography.MD5]::Create().ComputeHash(
            [System.Text.Encoding]::UTF8.GetBytes($caminho))).Replace('-', '').Substring(0, 8)
    if ($limpo.Length -gt 50) { $limpo = $limpo.Substring(0, 50) }
    return "nm_${limpo}_$hash"
}

foreach ($arquivo in $arquivos) {
    $relativo = $arquivo.FullName.Substring($nodeModules.Length).TrimStart('\')
    $pastaRel = Split-Path $relativo -Parent

    # Declara a cadeia de diretórios até este arquivo, de fora pra dentro.
    if ($pastaRel -and -not $dirsVistos.ContainsKey($pastaRel)) {
        $partes = $pastaRel -split '\\'
        for ($i = 0; $i -lt $partes.Count; $i++) {
            $parcial = ($partes[0..$i] -join '\')
            if ($dirsVistos.ContainsKey($parcial)) { continue }
            $paiId = if ($i -eq 0) { 'DirNodeModules' } else { $dirsVistos[($partes[0..($i - 1)] -join '\')] }
            $dirId = IdSeguro "dir_$parcial"
            $dirsVistos[$parcial] = $dirId
            $nome = [System.Security.SecurityElement]::Escape($partes[$i])
            [void]$dirsXml.AppendLine("      <DirectoryRef Id=`"$paiId`"><Directory Id=`"$dirId`" Name=`"$nome`" /></DirectoryRef>")
        }
    }

    $dirId = if ($pastaRel) { $dirsVistos[$pastaRel] } else { 'DirNodeModules' }
    $compId = IdSeguro "c_$relativo"
    $fileId = IdSeguro "f_$relativo"
    $origem = [System.Security.SecurityElement]::Escape($arquivo.FullName)
    $nomeArq = [System.Security.SecurityElement]::Escape($arquivo.Name)

    [void]$sb.AppendLine("      <Component Id=`"$compId`" Directory=`"$dirId`" Guid=`"*`">")
    [void]$sb.AppendLine("        <File Id=`"$fileId`" Source=`"$origem`" Name=`"$nomeArq`" KeyPath=`"yes`" />")
    [void]$sb.AppendLine('      </Component>')
    $idx++
}

[void]$sb.AppendLine('    </ComponentGroup>')
[void]$sb.AppendLine($dirsXml.ToString())
[void]$sb.AppendLine('  </Fragment>')
[void]$sb.AppendLine('</Wix>')

$fragmento = Join-Path $PSScriptRoot 'NodeModules.g.wxs'
[System.IO.File]::WriteAllText($fragmento, $sb.ToString(), [System.Text.UTF8Encoding]::new($false))
Escrever "$idx arquivo(s) de dependência incluídos."

# --- 5. Tarefa agendada ---------------------------------------------------
# O caminho de instalação é absoluto no XML (o Agendador não expande
# variáveis de ambiente ali), então o substituímos agora.
$destino = "$env:ProgramData\GMAD\inventario"
$tarefaXml = (Get-Content (Join-Path $PSScriptRoot 'tarefa-inventario.xml') -Raw).Replace('{INSTALL_DIR}', $destino)
$tarefaGerada = Join-Path $PSScriptRoot 'tarefa-inventario.g.xml'
# UTF-16 com BOM: schtasks /XML recusa o arquivo em outra codificação.
[System.IO.File]::WriteAllText($tarefaGerada, $tarefaXml, [System.Text.UnicodeEncoding]::new($false, $true))

# --- 6. Ícone -------------------------------------------------------------
# Um .ico é obrigatório pro <Icon> em "Programas e Recursos". Se o projeto
# não trouxer um, reaproveitamos o do próprio Windows em vez de falhar o
# build por causa de arte.
$icone = Join-Path $PSScriptRoot 'agente.ico'
if (-not (Test-Path $icone)) {
    $iconePadrao = Join-Path $env:SystemRoot 'System32\shell32.dll'
    Add-Type -AssemblyName System.Drawing
    $extraido = [System.Drawing.Icon]::ExtractAssociatedIcon($iconePadrao)
    $fs = [System.IO.File]::Create($icone)
    try { $extraido.Save($fs) } finally { $fs.Dispose() }
    Escrever 'Ícone padrão gerado (substitua agente.ico para usar a arte da GMAD).'
}

# --- 7. Compilar ----------------------------------------------------------
if (-not (Test-Path $SaidaDir)) { New-Item -ItemType Directory -Path $SaidaDir -Force | Out-Null }
$msi = Join-Path $SaidaDir "GMAD-Agente-Inventario-$Versao.msi"

Escrever 'Compilando o MSI...'
# -sw1076 silencia o ICE61 ("o produto deveria remover só versões
# anteriores de si mesmo"): é consequência direta e desejada de
# AllowSameVersionUpgrades, que permite recompilar e reinstalar a mesma
# versão durante o desenvolvimento sem desinstalar antes.
& wix build `
    (Join-Path $PSScriptRoot 'Package.wxs') `
    $fragmento `
    -ext WixToolset.Util.wixext `
    -arch x64 `
    -sw1076 `
    -d "Versao=$Versao" `
    -d "PastaAgente=$PastaAgente" `
    -d "PastaMsi=$PSScriptRoot" `
    -d "ArquivoEnv=$ArquivoEnv" `
    -d "ArquivoTarefa=$tarefaGerada" `
    -d "IconeArquivo=$icone" `
    -o $msi

if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar o MSI (código $LASTEXITCODE)." }

# --- 8. Validação ---------------------------------------------------------
# Roda o conjunto ICE oficial da Microsoft: pega problemas que só
# apareceriam na hora de instalar (caminhos inválidos, componentes mal
# formados, sequência de ações incoerente). Vale os poucos segundos — um
# MSI quebrado descoberto em 60 máquinas custa muito mais caro.
Escrever 'Validando o pacote (ICE)...'
& wix msi validate $msi -sw1076
if ($LASTEXITCODE -ne 0) {
    throw "O MSI foi gerado mas NÃO passou na validação (código $LASTEXITCODE). Corrija antes de distribuir."
}
Escrever 'Validação OK.'

$tamanho = [math]::Round((Get-Item $msi).Length / 1MB, 1)
Escrever "MSI gerado: $msi ($tamanho MB)"
Write-Host ''
Write-Host 'ATENÇÃO: este MSI contém as credenciais do agente.' -ForegroundColor Yellow
Write-Host 'Guarde-o num compartilhamento restrito à equipe de TI.' -ForegroundColor Yellow
