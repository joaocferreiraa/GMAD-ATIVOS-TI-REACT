// Coleta o INVENTÁRIO de hardware/software da máquina onde roda (specs
// completas: placa, CPU, pentes de RAM, discos, GPU, rede, software) —
// alimenta a aba "Inventário" do painel, tabela host_inventory.
//
// DIFERENÇA PRA hostMetrics.js: aquele mede o ESTADO (CPU 40% agora), este
// levanta a FICHA TÉCNICA (qual CPU é). Um vira série temporal, o outro é
// cadastro sobrescrito a cada coleta — ver o comentário de topo em
// supabase/migrations/0008_host_inventory.sql.
//
// Sem dependências novas: tudo sai de comandos do próprio Windows via
// PowerShell/CIM, mesma abordagem já usada pro disco em hostMetrics.js.
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs/promises'
import { execFile, exec } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
// exec (com shell) só é usado na coleta do ID do RustDesk, que precisa de
// redirecionamento de saída — ver coletarRustDeskId. Todo o resto usa
// execFile, sem shell, que é a forma segura.
const execAsync = promisify(exec)

// Versão do formato de coleta, gravada junto com os dados. Com 60+ agentes
// instalados, eles nunca estão todos na mesma versão ao mesmo tempo — sem
// isso, não dá pra saber se um campo vazio é "a máquina não tem" ou "esse
// agente é velho demais pra coletar isso".
export const AGENTE_VERSAO = '1.2.1'

// Buffer generoso: a consulta de software instalado devolve algumas
// centenas de KB numa máquina com muitos programas, e o padrão do
// execFile (1 MB) fica apertado quando somamos tudo num JSON só.
const MAX_BUFFER = 12 * 1024 * 1024

// Timeout por consulta. WMI/CIM às vezes trava (serviço Winmgmt
// degradado); sem timeout o agente ficaria pendurado pra sempre numa
// máquina problemática. Cada bloco falha isolado — ver runPs.
const TIMEOUT_MS = 60000

// Onde o rustdesk.exe costuma estar. A instalação padrão é a primeira; a
// segunda cobre máquina 32 bits ou instalação antiga.
const CAMINHOS_RUSTDESK = [
  `${process.env.ProgramFiles || 'C:\\Program Files'}\\RustDesk\\rustdesk.exe`,
  `${process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'}\\RustDesk\\rustdesk.exe`,
]

// Executa PowerShell e devolve JSON já parseado. Toda coleta passa por
// aqui, e QUALQUER falha (WMI quebrado, política de execução, timeout)
// devolve null em vez de derrubar o processo: uma máquina com o serviço de
// GPU quebrado ainda deve reportar CPU, RAM e disco. Melhor inventário
// parcial do que nenhum — mesma regra do resto do agente: nunca inventar
// um número, mas também nunca desistir do que dá pra medir.
async function runPs(script) {
  try {
    const { stdout } = await execFileAsync(
      'powershell',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { timeout: TIMEOUT_MS, maxBuffer: MAX_BUFFER, windowsHide: true },
    )
    const texto = stdout.trim()
    if (!texto) return null
    return JSON.parse(texto)
  } catch {
    return null
  }
}

// ConvertTo-Json devolve um OBJETO quando há um único resultado e um ARRAY
// quando há vários — sem isso, uma máquina com um pente de RAM só quebraria
// o .map() de quem consome. Idem pra null.
function comoArray(v) {
  if (v === null || v === undefined) return []
  return Array.isArray(v) ? v : [v]
}

// Number() em valor ausente devolve 0 ou NaN, os dois enganosos aqui:
// "0 MHz de clock" parece medição, mas é ausência de dado. null é o que o
// painel sabe exibir como "—".
function num(v) {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function texto(v) {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  return s === '' ? null : s
}

// Win32_SystemEnclosure.ChassisTypes -> categoria legível. Os códigos são
// da especificação SMBIOS; mapeamos só os que aparecem num parque de
// escritório e agrupamos o resto como "Outro". Serve pra tela separar
// desktop de notebook sem alguém precisar classificar 60 máquinas na mão.
const CHASSI_NOTEBOOK = new Set([8, 9, 10, 11, 12, 14, 18, 21, 30, 31, 32])
const CHASSI_DESKTOP = new Set([3, 4, 5, 6, 7, 13, 15, 16, 24, 35])
const CHASSI_SERVIDOR = new Set([17, 23, 25, 28, 29])

// SMBIOSMemoryType -> nome do padrão. O WMI devolve o código numérico da
// especificação SMBIOS (26=DDR4, 34=DDR5); sem traduzir, a tela mostraria
// "34" pra quem quer saber se a máquina é DDR4 ou DDR5 na hora de comprar
// pente. Código desconhecido é devolvido como veio, em vez de virar null —
// um número bruto ainda é pesquisável, ausência não.
const TIPOS_MEMORIA = {
  20: 'DDR',
  21: 'DDR2',
  24: 'DDR3',
  26: 'DDR4',
  34: 'DDR5',
  35: 'LPDDR4',
  36: 'LPDDR5',
}

function tipoMemoria(codigo) {
  const n = num(codigo)
  if (n === null) return null
  return TIPOS_MEMORIA[n] || String(n)
}

function classificarChassi(codigos) {
  const lista = comoArray(codigos)
    .map((c) => num(c))
    .filter((c) => c !== null)
  if (!lista.length) return null
  // Notebook primeiro: máquinas all-in-one e mini-PC às vezes reportam
  // dois códigos, e "é portátil" é a informação que muda a decisão de TI.
  if (lista.some((c) => CHASSI_NOTEBOOK.has(c))) return 'Notebook'
  if (lista.some((c) => CHASSI_SERVIDOR.has(c))) return 'Servidor'
  if (lista.some((c) => CHASSI_DESKTOP.has(c))) return 'Desktop'
  return 'Outro'
}

// Datas do WMI chegam como /Date(1699999999999)/ quando serializadas pelo
// ConvertTo-Json. Convertemos pra ISO; qualquer outro formato vira null em
// vez de uma data inválida.
function dataWmi(v) {
  if (!v) return null
  if (v instanceof Date) return v.toISOString()
  const m = String(v).match(/\/Date\((\d+)\)\//)
  if (m) return new Date(Number(m[1])).toISOString()
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

// --- Blocos de coleta -----------------------------------------------------
// Cada bloco é uma consulta independente. Falha em um não afeta os outros
// (runPs devolve null), então o inventário sai parcial em vez de vazio.

async function coletarSistema() {
  const d = await runPs(
    'Get-CimInstance Win32_ComputerSystem | Select-Object Name,Domain,Manufacturer,Model,UserName,TotalPhysicalMemory | ConvertTo-Json -Compress',
  )
  const produto = await runPs(
    'Get-CimInstance Win32_ComputerSystemProduct | Select-Object UUID | ConvertTo-Json -Compress',
  )
  const bios = await runPs(
    'Get-CimInstance Win32_BIOS | Select-Object SerialNumber | ConvertTo-Json -Compress',
  )
  const chassi = await runPs(
    'Get-CimInstance Win32_SystemEnclosure | Select-Object ChassisTypes | ConvertTo-Json -Compress',
  )

  // UUID nulo/zerado acontece em VM e em placa com SMBIOS mal preenchido —
  // nesses casos não dá pra usar como chave (todas as máquinas viriam
  // iguais e sobrescreveriam umas às outras). Ver montarInventario.
  const uuid = texto(produto?.UUID)
  const uuidValido =
    uuid && !/^0{8}-0{4}-0{4}-0{4}-0{12}$/i.test(uuid) && !/^FFFFFFFF-/i.test(uuid) ? uuid : null

  return {
    uuid: uuidValido,
    hostname: texto(d?.Name) || os.hostname(),
    dominio: texto(d?.Domain),
    usuarioLogado: texto(d?.UserName),
    fabricante: texto(d?.Manufacturer),
    modelo: texto(d?.Model),
    numeroSerie: texto(bios?.SerialNumber),
    tipoChassi: classificarChassi(chassi?.ChassisTypes),
    ramTotalBytes: num(d?.TotalPhysicalMemory),
  }
}

async function coletarSO() {
  const d = await runPs(
    'Get-CimInstance Win32_OperatingSystem | Select-Object Caption,Version,BuildNumber,OSArchitecture,InstallDate | ConvertTo-Json -Compress',
  )
  return {
    soNome: texto(d?.Caption),
    soVersao: texto(d?.Version),
    soBuild: texto(d?.BuildNumber),
    soArquitetura: texto(d?.OSArchitecture),
    soInstaladoEm: dataWmi(d?.InstallDate),
  }
}

async function coletarCpu() {
  // Só o primeiro processador: máquina com dois sockets é rara no parque e
  // o painel mostra um modelo por máquina. Núcleos/threads já vêm somados
  // por socket pelo próprio WMI.
  const lista = comoArray(
    await runPs(
      'Get-CimInstance Win32_Processor | Select-Object Name,Manufacturer,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed | ConvertTo-Json -Compress',
    ),
  )
  const d = lista[0]
  return {
    cpuModelo: texto(d?.Name),
    cpuFabricante: texto(d?.Manufacturer),
    cpuNucleos: num(d?.NumberOfCores),
    cpuThreads: num(d?.NumberOfLogicalProcessors),
    cpuClockMhz: num(d?.MaxClockSpeed),
  }
}

async function coletarMemoria() {
  const pentes = comoArray(
    await runPs(
      'Get-CimInstance Win32_PhysicalMemory | Select-Object DeviceLocator,Capacity,Speed,Manufacturer,SMBIOSMemoryType | ConvertTo-Json -Compress',
    ),
  )
  // Total de slots da placa (não dos pentes instalados) — é o que responde
  // "dá pra colocar mais RAM sem trocar o que já tem?".
  const arrays = comoArray(
    await runPs(
      'Get-CimInstance Win32_PhysicalMemoryArray | Select-Object MemoryDevices | ConvertTo-Json -Compress',
    ),
  )
  const slotsTotais = arrays.reduce((s, a) => s + (num(a?.MemoryDevices) || 0), 0) || null

  return {
    ramSlotsUsados: pentes.length || null,
    ramSlotsTotais: slotsTotais,
    ramPentes: pentes.map((p) => ({
      slot: texto(p?.DeviceLocator),
      capacidadeBytes: num(p?.Capacity),
      velocidadeMhz: num(p?.Speed),
      fabricante: texto(p?.Manufacturer),
      tipo: tipoMemoria(p?.SMBIOSMemoryType),
    })),
  }
}

async function coletarDiscos() {
  // Get-PhysicalDisk (módulo Storage) traz MediaType (SSD/HDD) e
  // HealthStatus, que Win32_DiskDrive não tem — é o dado que decide troca
  // de máquina. Em Windows antigo sem esse módulo, runPs devolve null e
  // ficamos só com o espaço dos volumes lógicos abaixo.
  //
  // Filtra USB: pendrive e HD externo plugados no momento da coleta
  // apareceriam como se fossem disco da máquina, poluindo a ficha e
  // distorcendo o levantamento de "quem ainda tem HDD" — e o resultado
  // mudaria conforme o que estivesse espetado naquele minuto. Mesma razão
  // do filtro DriveType=3 nos volumes lógicos, logo abaixo.
  const fisicos = comoArray(
    await runPs(
      "Get-PhysicalDisk | Where-Object BusType -ne 'USB' | " +
        'Select-Object FriendlyName,MediaType,Size,HealthStatus,BusType | ConvertTo-Json -Compress',
    ),
  )

  // Espaço total/livre dos volumes fixos — mesma consulta (e mesmo motivo
  // do filtro DriveType=3) já usada em hostMetrics.js: exclui pendrive e
  // unidade de rede, que não são disco do PC.
  const logicos = comoArray(
    await runPs(
      "Get-CimInstance Win32_LogicalDisk -Filter 'DriveType=3' | Select-Object Size,FreeSpace | ConvertTo-Json -Compress",
    ),
  )
  const total = logicos.reduce((s, d) => s + (num(d?.Size) || 0), 0) || null
  const livre = logicos.reduce((s, d) => s + (num(d?.FreeSpace) || 0), 0) || null

  return {
    discos: fisicos.map((d) => ({
      modelo: texto(d?.FriendlyName),
      // MediaType vem numérico em algumas versões (3=HDD, 4=SSD) e string
      // em outras — normalizamos pro que a tela mostra.
      tipoMidia:
        texto(d?.MediaType) === '3'
          ? 'HDD'
          : texto(d?.MediaType) === '4'
            ? 'SSD'
            : texto(d?.MediaType),
      tamanhoBytes: num(d?.Size),
      saude: texto(d?.HealthStatus),
      interface: texto(d?.BusType),
    })),
    discoTotalBytes: total,
    discoLivreBytes: livre,
  }
}

async function coletarGpus() {
  const lista = comoArray(
    await runPs(
      'Get-CimInstance Win32_VideoController | Select-Object Name,AdapterRAM,DriverVersion | ConvertTo-Json -Compress',
    ),
  )
  return lista.map((g) => ({
    modelo: texto(g?.Name),
    // AdapterRAM é int32 com sinal no WMI: placas com 4 GB ou mais chegam
    // negativas ou truncadas. Valor negativo vira null em vez de virar um
    // número absurdo na tela.
    memoriaBytes: (num(g?.AdapterRAM) ?? 0) > 0 ? num(g?.AdapterRAM) : null,
    driver: texto(g?.DriverVersion),
  }))
}

async function coletarRede() {
  // Só adaptadores ativos (Status Up) e físicos: sem isso a lista viria
  // cheia de adaptadores virtuais (VPN, VirtualBox, loopback) que não
  // ajudam a identificar a máquina na rede.
  // Velocidade sai de `Speed` (UInt64, bits/s), NÃO de `LinkSpeed`: esta
  // última é a versão FORMATADA pra leitura humana ("1.2 Gbps"), uma
  // string — dividir por 1e6 lança erro e derruba o ForEach-Object inteiro,
  // devolvendo lista vazia mesmo com adaptadores ativos.
  const lista = comoArray(
    await runPs(
      "Get-NetAdapter -Physical | Where-Object Status -eq 'Up' | ForEach-Object { " +
        // try por adaptador: sem isso, uma placa que falhe na consulta de
        // IP (adaptador sumindo no meio da coleta) zeraria a lista toda.
        'try { ' +
        '$ips = @(Get-NetIPAddress -InterfaceIndex $_.ifIndex -AddressFamily IPv4 -ErrorAction SilentlyContinue | ' +
        'Select-Object -ExpandProperty IPAddress); ' +
        '[pscustomobject]@{ Nome=$_.Name; Mac=$_.MacAddress; ' +
        'VelocidadeMbps=$(if ($_.Speed -gt 0) { [math]::Round($_.Speed/1000000) } else { $null }); ' +
        'Ips=$ips } ' +
        '} catch { } ' +
        '} | ConvertTo-Json -Compress',
    ),
  )
  return lista.map((a) => ({
    nome: texto(a?.Nome),
    mac: texto(a?.Mac),
    velocidadeMbps: num(a?.VelocidadeMbps),
    ips: comoArray(a?.Ips).map(texto).filter(Boolean),
  }))
}

async function coletarSoftwares() {
  // Lê o registro (as duas árvores: 64 e 32 bits) em vez de
  // Win32_Product: essa classe do WMI dispara uma reconfiguração/validação
  // de CADA pacote MSI instalado ao ser consultada — é lenta (minutos) e
  // chega a gerar eventos de reparo no visualizador de eventos da máquina.
  // O registro é a fonte que o próprio "Programas e Recursos" usa.
  const lista = comoArray(
    await runPs(
      "Get-ItemProperty 'HKLM:\\Software\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*', " +
        "'HKLM:\\Software\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\*' " +
        '-ErrorAction SilentlyContinue | ' +
        // SystemComponent/ParentKeyName filtram atualizações e componentes
        // que não aparecem como "programa instalado" pro usuário.
        'Where-Object { $_.DisplayName -and -not $_.SystemComponent -and -not $_.ParentKeyName } | ' +
        'Select-Object DisplayName,DisplayVersion,Publisher | ' +
        'Sort-Object DisplayName -Unique | ConvertTo-Json -Compress',
    ),
  )
  return lista
    .map((s) => ({
      nome: texto(s?.DisplayName),
      versao: texto(s?.DisplayVersion),
      fabricante: texto(s?.Publisher),
    }))
    .filter((s) => s.nome)
}

// ID do RustDesk desta máquina — é o "número" que se digita pra abrir uma
// sessão de acesso remoto. Alimenta o botão "Acessar" na ficha da máquina
// no painel.
//
// POR QUE NÃO LER O RustDesk.toml: o arquivo de configuração guarda o ID
// como `enc_id` (criptografado com uma chave derivada da própria máquina),
// não em texto puro — não dá pra extrair lendo o arquivo. O caminho
// suportado é perguntar ao próprio executável.
//
// POR QUE VIA ARQUIVO TEMPORÁRIO: o rustdesk.exe é um app de GUI (subsystem
// Windows, não console). Ele NÃO escreve no stdout herdado do processo pai
// — capturar direto com execFile devolve string vazia, verificado nesta
// máquina. Redirecionar a saída pra um arquivo é o que funciona.
async function coletarRustDeskId() {
  let exe = null
  for (const caminho of CAMINHOS_RUSTDESK) {
    try {
      await fs.access(caminho)
      exe = caminho
      break
    } catch {
      // Caminho não existe — tenta o próximo.
    }
  }
  if (!exe) return { rustdeskId: null, rustdeskInstalado: false }

  // Arquivo próprio por execução (PID + timestamp): duas coletas
  // simultâneas na mesma máquina não podem sobrescrever o arquivo uma da
  // outra.
  const saida = path.join(os.tmpdir(), `gmad-rustdesk-${process.pid}-${Date.now()}.txt`)
  try {
    // Redirecionamento pelo shell (`> arquivo`) em vez de ler o stdout do
    // processo: é o que captura a saída de um app de GUI.
    //
    // Com `shell: true`, o Node monta a linha de comando e o `cmd` faz o
    // redirecionamento. As aspas em cada caminho são necessárias porque
    // ambos contêm espaço ("Program Files", perfil do usuário) — sem elas o
    // cmd corta o caminho no primeiro espaço.
    await execAsync(`"${exe}" --get-id > "${saida}"`, {
      timeout: 30000,
      windowsHide: true,
    })
    const conteudo = (await fs.readFile(saida, 'utf8')).trim()
    // O ID do RustDesk é numérico (9 dígitos hoje). Validar o formato evita
    // gravar uma mensagem de erro do executável como se fosse um ID.
    const id = /^\d{6,}$/.test(conteudo) ? conteudo : null
    return { rustdeskId: id, rustdeskInstalado: true }
  } catch {
    // Instalado, mas não respondeu (versão antiga sem --get-id, serviço
    // parado). `instalado: true` continua sendo a informação correta — e o
    // painel mostra "instalado, ID indisponível" em vez de "não instalado".
    return { rustdeskId: null, rustdeskInstalado: true }
  } finally {
    await fs.unlink(saida).catch(() => {})
  }
}

// --- Montagem -------------------------------------------------------------

// Inventário completo da máquina. Os blocos rodam em paralelo (são
// consultas independentes e cada uma leva de centenas de ms a alguns
// segundos; em série a coleta passaria de meio minuto no logon).
export async function collectInventory() {
  if (os.platform() !== 'win32') {
    throw new Error(
      'A coleta de inventário usa CIM/WMI e só funciona no Windows. ' +
        'Neste sistema, rode o agente apenas em modo de monitoramento de rede.',
    )
  }

  const [sistema, so, cpu, memoria, disco, gpus, rede, softwares, rustdesk] = await Promise.all([
    coletarSistema(),
    coletarSO(),
    coletarCpu(),
    coletarMemoria(),
    coletarDiscos(),
    coletarGpus(),
    coletarRede(),
    coletarSoftwares(),
    coletarRustDeskId(),
  ])

  // Sem UUID de hardware utilizável (VM, SMBIOS zerado), caímos pro número
  // de série e, em último caso, pro hostname. Não é o ideal — hostname
  // muda —, mas é melhor que perder a máquina do inventário, e o prefixo
  // deixa explícito na tela qual identidade está sendo usada.
  const machineUid =
    sistema.uuid ||
    (sistema.numeroSerie ? `serie:${sistema.numeroSerie}` : `host:${sistema.hostname}`)

  return {
    machineUid,
    hostname: sistema.hostname,
    dominio: sistema.dominio,
    usuarioLogado: sistema.usuarioLogado,
    fabricante: sistema.fabricante,
    modelo: sistema.modelo,
    numeroSerie: sistema.numeroSerie,
    tipoChassi: sistema.tipoChassi,
    ...so,
    ...cpu,
    ramTotalBytes: sistema.ramTotalBytes,
    ...memoria,
    ...disco,
    gpus,
    adaptadoresRede: rede,
    softwares,
    ...rustdesk,
    agenteVersao: AGENTE_VERSAO,
  }
}
