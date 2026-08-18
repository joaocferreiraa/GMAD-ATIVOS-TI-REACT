# Compila o instalador COMPLETO (.exe) do Agente de Inventário da GMAD.
#
# Diferença para o build.ps1 (que gera o .msi): este empacota o MSI do
# agente JUNTO com o instalador do Node.js, então a estação não precisa de
# nenhum preparo prévio nem de acesso à internet.
#
# Uso (PowerShell, não precisa de administrador):
#   .\build-exe.ps1 -ArquivoEnv "C:\deploy\.env"
#
# Gera: dist\GMAD-Agente-Inventario-<versao>.exe (~31 MB)
#
# Ver README.md nesta pasta.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$ArquivoEnv,

    [string]$Versao,

    [string]$SaidaDir = "$PSScriptRoot\dist",

    # Versão LTS do Node embutida. Mantida como parâmetro (e não fixa no
    # código) porque trocar de LTS é manutenção esperada, não reescrita.
    [string]$NodeVersao = '22.11.0',

    # Versão do RustDesk embutida (acesso remoto). Mesmo motivo do Node.
    [string]$RustDeskVersao = '1.4.9',

    # Gera o instalador SEM o RustDesk embutido (~24 MB menor). Útil para
    # servidores, onde acesso remoto por RustDesk não faz sentido. O
    # instalador completo também permite pular na hora da instalação, com
    # INSTALARRUSTDESK=0 — este parâmetro é para nem carregar o peso.
    [switch]$SemRustDesk
)

$ErrorActionPreference = 'Stop'
function Escrever($msg) { Write-Host "[build-exe] $msg" -ForegroundColor Cyan }

$toolsDir = Join-Path $env:USERPROFILE '.dotnet\tools'
if (Test-Path $toolsDir -PathType Container) {
    if ($env:PATH -notlike "*$toolsDir*") { $env:PATH = "$env:PATH;$toolsDir" }
}
if (-not (Get-Command wix -ErrorAction SilentlyContinue)) {
    throw "WiX não encontrado. Instale com: dotnet tool install --global wix --version 5.0.2"
}

Escrever 'Garantindo as extensões do WiX...'
& wix extension add --global WixToolset.Util.wixext/5.0.2 2>&1 | Out-Null
& wix extension add --global WixToolset.BootstrapperApplications.wixext/5.0.2 2>&1 | Out-Null

# --- 1. O MSI do agente ---------------------------------------------------
# O .exe embrulha o .msi, então o MSI precisa existir e estar atualizado.
# Compilamos sempre, em vez de reaproveitar um antigo da pasta dist: um
# bundle carregando um MSI defasado é um bug silencioso e caro de achar.
#
# O MSI vai para uma pasta de TRABALHO (obj\), não para dist\: quem instala
# usa o .exe, e ter os dois lado a lado só gera a dúvida "qual eu executo?"
# — o .msi sozinho instala o agente SEM Node nem RustDesk, que não é o que
# se quer numa estação. Quem precisar do .msi para GPO compila com
# build.ps1 diretamente.
$trabalhoDir = Join-Path $PSScriptRoot 'obj'
Escrever 'Compilando o MSI do agente...'
& "$PSScriptRoot\build.ps1" -ArquivoEnv $ArquivoEnv -Versao $Versao -SaidaDir $trabalhoDir
if ($LASTEXITCODE -ne 0) { throw 'Falha ao compilar o MSI do agente.' }

if (-not $Versao) {
    $pkg = Get-Content (Join-Path (Split-Path $PSScriptRoot -Parent) 'package.json') -Raw | ConvertFrom-Json
    $Versao = $pkg.version
}
$msiAgente = Join-Path $trabalhoDir "GMAD-Agente-Inventario-$Versao.msi"
if (-not (Test-Path $msiAgente)) { throw "MSI do agente não encontrado: $msiAgente" }

# --- 2. O instalador do Node ----------------------------------------------
# Baixado uma vez e mantido em redist\ (fora do git, ver .gitignore). O
# hash é conferido contra o SHASUMS256.txt oficial do nodejs.org SEMPRE,
# inclusive quando o arquivo já existe localmente: é um binário de terceiro
# que vai ser instalado em 60+ máquinas com privilégio de SYSTEM, e um
# arquivo corrompido (download interrompido) ou adulterado não pode passar
# despercebido.
$redist = Join-Path $PSScriptRoot 'redist'
$nodeMsi = Join-Path $redist "node-v$NodeVersao-x64.msi"
if (-not (Test-Path $redist)) { New-Item -ItemType Directory -Path $redist -Force | Out-Null }

# Baixa (se preciso) e CONFERE o hash de um instalador de terceiro.
# Sempre reconfere, mesmo com o arquivo já em disco: são binários que rodam
# como SYSTEM em dezenas de máquinas, e um download interrompido ou
# adulterado não pode passar despercebido.
#
# `$hashEsperado` fixado no código (não lido de um arquivo de checksums
# baixado na hora) para o RustDesk: o hash publicado pelo GitHub viria pelo
# mesmo canal do binário, então não seria verificação independente. Fixá-lo
# aqui trava a versão exata que foi auditada — se o upstream trocar o
# arquivo, o build falha e alguém revisa.
function ObterInstalador {
    param(
        [string]$Caminho,
        [string]$Url,
        [string]$Nome,
        [string]$HashEsperado,   # opcional: quando vazio, busca em $UrlSums
        [string]$UrlSums,
        [string]$NomeNoSums
    )

    if (-not (Test-Path $Caminho)) {
        Escrever "Baixando $Nome..."
        Invoke-WebRequest -Uri $Url -OutFile $Caminho -UseBasicParsing -TimeoutSec 900
    }

    $local = (Get-FileHash $Caminho -Algorithm SHA256).Hash.ToUpper()

    if ($HashEsperado) {
        if ($local -ne $HashEsperado.ToUpper()) {
            Remove-Item $Caminho -Force
            throw "SHA256 de $Nome NAO confere com o valor esperado. O arquivo foi descartado; rode novamente. (esperado $HashEsperado, obtido $local)"
        }
        Escrever "Integridade de $Nome conferida."
        return
    }

    try {
        $sums = (Invoke-WebRequest -Uri $UrlSums -UseBasicParsing -TimeoutSec 120).Content
        $linha = ($sums -split "`n") | Where-Object { $_ -match [regex]::Escape($NomeNoSums) }
        if (-not $linha) { throw "não há entrada para $NomeNoSums na lista de checksums" }
        $oficial = (($linha -split '\s+')[0]).ToUpper()
        if ($oficial -ne $local) {
            Remove-Item $Caminho -Force
            throw "SHA256 de $Nome NAO confere com o publicado pelo fornecedor. O arquivo baixado foi descartado; rode novamente."
        }
        Escrever "Integridade de $Nome conferida (SHA256 bate com o oficial)."
    }
    catch [System.Net.WebException] {
        # Sem internet, seguimos apenas se o arquivo já estava aqui de um
        # build anterior (que verificou o hash). Não baixar E não verificar
        # seria o cenário ruim; este é "já verificado antes, offline agora".
        Escrever "AVISO: não foi possível contatar o fornecedor para reconferir o hash de $Nome ($($_.Exception.Message))."
        Escrever '       Usando o arquivo local, verificado em um build anterior.'
    }
}

ObterInstalador -Caminho $nodeMsi `
    -Url "https://nodejs.org/dist/v$NodeVersao/node-v$NodeVersao-x64.msi" `
    -Nome "Node.js $NodeVersao LTS (~29 MB)" `
    -UrlSums "https://nodejs.org/dist/v$NodeVersao/SHASUMS256.txt" `
    -NomeNoSums "node-v$NodeVersao-x64.msi"

# --- 2-B. O instalador do RustDesk ---------------------------------------
# SHA256 da release 1.4.9 oficial, conferido no momento de escrever este
# script. Trocar de versão exige atualizar este hash junto — é intencional:
# obriga uma conferência consciente em vez de aceitar qualquer binário que o
# upstream publique.
$RUSTDESK_SHA256 = @{
    '1.4.9' = 'C87D2F4CEF2A5ACD6003B6507DCFBF5D5168A256DB082CD90B54D35193224AAA'
}

$rustdeskMsi = Join-Path $redist "rustdesk-$RustDeskVersao-x86_64.msi"
if (-not $SemRustDesk) {
    $hashRd = $RUSTDESK_SHA256[$RustDeskVersao]
    if (-not $hashRd) {
        throw @"
Não há SHA256 conhecido para o RustDesk $RustDeskVersao.
Baixe o MSI, confira a assinatura/hash na página da release
(https://github.com/rustdesk/rustdesk/releases) e acrescente o valor em
`$RUSTDESK_SHA256, neste script.
"@
    }
    ObterInstalador -Caminho $rustdeskMsi `
        -Url "https://github.com/rustdesk/rustdesk/releases/download/$RustDeskVersao/rustdesk-$RustDeskVersao-x86_64.msi" `
        -Nome "RustDesk $RustDeskVersao (~24 MB)" `
        -HashEsperado $hashRd
}

# --- 3. Ícone -------------------------------------------------------------
# Gerado pelo build.ps1 no passo 1; aqui só confirmamos.
$icone = Join-Path $PSScriptRoot 'agente.ico'
if (-not (Test-Path $icone)) { throw "Ícone não encontrado: $icone" }

# --- 4. Compilar o bundle -------------------------------------------------
# Sufixo no nome quando sai sem RustDesk: os dois arquivos convivem na
# mesma pasta de distribuição sem um sobrescrever o outro, e dá pra saber
# qual é qual pelo nome.
$sufixo = if ($SemRustDesk) { '-sem-rustdesk' } else { '' }
$exe = Join-Path $SaidaDir "GMAD-Agente-Inventario-$Versao$sufixo.exe"

Escrever 'Compilando o instalador completo (.exe)...'
& wix build `
    (Join-Path $PSScriptRoot 'Bundle.wxs') `
    -ext WixToolset.Util.wixext `
    -ext WixToolset.BootstrapperApplications.wixext `
    -arch x64 `
    -d "Versao=$Versao" `
    -d "MsiAgente=$msiAgente" `
    -d "NodeMsi=$nodeMsi" `
    -d "RustDeskMsi=$rustdeskMsi" `
    -d "RustDeskVersao=$RustDeskVersao" `
    -d "ComRustDesk=$(if ($SemRustDesk) { '0' } else { '1' })" `
    -d "IconeArquivo=$icone" `
    -o $exe

if ($LASTEXITCODE -ne 0) { throw "Falha ao compilar o .exe (código $LASTEXITCODE)." }

# .wixpdb é símbolo de depuração do WiX: não instala nada e só confunde quem
# abre a pasta procurando o instalador.
Remove-Item ([System.IO.Path]::ChangeExtension($exe, '.wixpdb')) -ErrorAction SilentlyContinue

$tamanho = [math]::Round((Get-Item $exe).Length / 1MB, 1)
Escrever "Instalador gerado: $exe ($tamanho MB)"
Escrever 'dist\ contém apenas o instalador — é o único arquivo a distribuir.'
Write-Host ''
Write-Host 'ATENÇÃO: este instalador contém as credenciais do agente.' -ForegroundColor Yellow
Write-Host 'Guarde-o num compartilhamento restrito à equipe de TI.' -ForegroundColor Yellow
Write-Host ''
Write-Host 'Instalação silenciosa:' -ForegroundColor Green
Write-Host "  `"$(Split-Path $exe -Leaf)`" /quiet /log install.log"
if (-not $SemRustDesk) {
    Write-Host ''
    Write-Host 'Para instalar SEM o RustDesk nesta máquina:' -ForegroundColor Green
    Write-Host "  `"$(Split-Path $exe -Leaf)`" /quiet INSTALARRUSTDESK=0"
}
