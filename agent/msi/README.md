# Instaladores do Agente de Inventário

Gera um instalador `.exe` ou `.msi` do agente de inventário — os formatos
que o Windows entende nativamente para instalar, atualizar e desinstalar
software em escala.

## Qual formato usar

| | `.exe` (recomendado) | `.msi` |
|---|---|---|
| Tamanho | ~53 MB | ~1,8 MB |
| Node.js | **Instala se faltar** | Exige pré-instalado |
| RustDesk (acesso remoto) | **Instala junto** | Não |
| Internet na estação | Não precisa | — |
| GPO → Instalação de Software | Não aceita | **Sim** |
| Intune / SCCM / manual | Sim | Sim |

O `.exe` embute os instaladores oficiais do Node.js e do RustDesk junto com
o agente, então uma máquina recém-formatada sai pronta: inventariada e
acessível remotamente pelo painel, sem preparo nenhum. É o caminho
recomendado, **exceto** para deploy por *GPO → Instalação de Software*, que
só aceita MSI — nesse caso use o `.msi` e distribua Node e RustDesk pelo seu
pacote de software (Intune, Chocolatey, WSUS).

### Variantes do `.exe`

| Comando | Gera | Quando usar |
|---|---|---|
| `build-exe.ps1 ...` | `...-1.0.0.exe` (~53 MB) | Estações — o caso normal |
| `build-exe.ps1 ... -SemRustDesk` | `...-1.0.0-sem-rustdesk.exe` (~30 MB) | Servidores, onde acesso remoto por RustDesk não faz sentido |
