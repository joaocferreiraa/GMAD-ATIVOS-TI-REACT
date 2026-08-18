@echo off
REM Wrapper chamado pela tarefa agendada (ver tarefa-inventario.xml).
REM
REM POR QUE ESTE ARQUIVO EXISTE:
REM O XML da tarefa agendada precisa de um caminho ABSOLUTO no campo
REM Command — o Agendador não resolve nome de programa pelo PATH nem
REM expande variaveis de ambiente ali. Mas o caminho do node.exe varia por
REM maquina (Program Files, instalacao por usuario, nvm, zip). Fixar um
REM caminho no momento de compilar o MSI daria uma tarefa quebrada em toda
REM maquina onde o Node estivesse em outro lugar.
REM
REM Com este wrapper, a tarefa aponta sempre para um caminho fixo (este
REM .cmd, dentro da pasta de instalacao) e a descoberta do Node acontece
REM na hora da execucao, na propria maquina.
REM
REM O log fica ao lado, em coleta.log: sem isso a saida da tarefa se perde
REM e diagnosticar uma maquina que nao reporta viraria adivinhacao.

setlocal

set "PASTA=%~dp0"
set "LOG=%PASTA%coleta.log"

REM 1) PATH (cobre a maioria das instalacoes e o nvm)
where node.exe >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    set "NODE=node.exe"
    goto :executar
)

REM 2) Caminhos padrao da instalacao oficial
if exist "%ProgramFiles%\nodejs\node.exe" (
    set "NODE=%ProgramFiles%\nodejs\node.exe"
    goto :executar
)
if exist "%ProgramFiles(x86)%\nodejs\node.exe" (
    set "NODE=%ProgramFiles(x86)%\nodejs\node.exe"
    goto :executar
)

REM 3) Registro (instalacao oficial grava InstallPath aqui)
for /f "tokens=2,*" %%A in ('reg query "HKLM\SOFTWARE\Node.js" /v InstallPath 2^>nul ^| findstr InstallPath') do (
    if exist "%%B\node.exe" (
        set "NODE=%%B\node.exe"
        goto :executar
    )
)

REM Trunca o log antes de escrever a falha: sem isso, uma maquina sem Node
REM acumularia a mesma linha a cada logon ate o arquivo crescer sem limite.
echo [%DATE% %TIME%] ERRO: Node.js nao encontrado nesta maquina. Instale o Node 18+ e rode a tarefa novamente.> "%LOG%"
exit /b 1

:executar
REM > (nao >>) mantem so a ULTIMA coleta no log. O historico de execucoes
REM fica no proprio Agendador de Tarefas (LastRunTime/LastTaskResult), e um
REM log que so cresce numa estacao de trabalho e' problema, nao recurso.
cd /d "%PASTA%"
echo [%DATE% %TIME%] Iniciando coleta com "%NODE%"> "%LOG%"
"%NODE%" inventario.js >> "%LOG%" 2>&1
set CODIGO=%ERRORLEVEL%
echo [%DATE% %TIME%] Coleta terminou com codigo %CODIGO%>> "%LOG%"
exit /b %CODIGO%
