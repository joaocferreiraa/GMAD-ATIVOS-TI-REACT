// Liga o que o AGENTE detecta (tabela host_inventory) ao que está
// CADASTRADO (gmad_ativos_data) — as duas metades da mesma máquina.
//
// São fontes de natureza diferente, e nenhuma substitui a outra:
//   cadastro -> unidade, departamento, usuário responsável, nota fiscal,
//               garantia, preço, status. Ninguém além de uma pessoa sabe.
//   agente   -> CPU, pentes de RAM, SSD/HDD, programas, IP, ID de acesso
//               remoto, se a máquina ainda está viva. Ninguém digita.
//
// O casamento acontece na LEITURA, não gravando um no outro: o inventário
// é fato observado, o cadastro é registro administrativo, e manter os dois
// separados deixa visível quando divergem.

// Normaliza para comparar: maiúsculas, sem espaço nas pontas. Hostname do
// Windows não diferencia maiúsculas de minúsculas, e o ID do ativo é
// digitado à mão (então vem com variação de caixa e espaço sobrando).
function norm(v) {
  return String(v ?? '')
    .trim()
    .toUpperCase()
}

// Seriais que NÃO identificam nada: placas de PC montado costumam vir com
// o SMBIOS por preencher, e o texto do fabricante entra no lugar do
// serial. Casar por esses valores juntaria máquinas diferentes que só têm
// em comum o fato de o fabricante ter sido desleixado.
const SERIAIS_INVALIDOS = new Set([
  'TO BE FILLED BY O.E.M.',
  'TO BE FILLED BY OEM',
  'DEFAULT STRING',
  'SYSTEM SERIAL NUMBER',
  'NONE',
  'N/A',
  'INVALID',
  '0',
  'NOT APPLICABLE',
  'NOT SPECIFIED',
])

function serialUtil(v) {
  const s = norm(v)
  if (!s || s.length < 3 || SERIAIS_INVALIDOS.has(s)) return null
  return s
}

// Índice das máquinas detectadas, por hostname e por serial.
//
// POR QUE HOSTNAME É A CHAVE PRINCIPAL (e não o serial, como seria o
// esperado): neste parque as máquinas de domínio são nomeadas com o
// próprio ID do ativo (o notebook cadastrado como NTB-0005 tem hostname
// NTB-0005). O serial fica como segunda tentativa porque o cadastro quase
// nunca o tem preenchido — é justamente o tipo de campo que o agente
// existe para preencher.
export function indexarInventario(inventario) {
  const porHostname = new Map()
  const porSerial = new Map()
  for (const m of inventario ?? []) {
    const h = norm(m.hostname)
    // Primeiro a reportar vence: em caso de dois registros com o mesmo
    // hostname (máquina reinstalada gerando UUID novo), o mais recente é o
    // que interessa — e getInventory já devolve ordenado por coleta
    // decrescente.
    if (h && !porHostname.has(h)) porHostname.set(h, m)
    const s = serialUtil(m.numeroSerie)
    if (s && !porSerial.has(s)) porSerial.set(s, m)
  }
  return { porHostname, porSerial }
}

// A máquina detectada correspondente a um ativo cadastrado, ou null.
export function maquinaDoAtivo(ativo, indice) {
  if (!ativo || !indice) return null
  return (
    indice.porHostname.get(norm(ativo.id)) ??
    (serialUtil(ativo.serial) ? indice.porSerial.get(serialUtil(ativo.serial)) : null) ??
    null
  )
}

// Máquinas que reportam mas NÃO têm ficha em Ativos — PC que entrou no
// parque sem passar pelo cadastro. É a informação mais acionável que o
// agente produz, então vira lista de trabalho no topo da tela em vez de
// ficar escondida.
export function maquinasSemCadastro(inventario, ativos) {
  const idsCadastrados = new Set()
  const seriaisCadastrados = new Set()
  for (const a of ativos ?? []) {
    if (a.id) idsCadastrados.add(norm(a.id))
    const s = serialUtil(a.serial)
    if (s) seriaisCadastrados.add(s)
  }
  return (inventario ?? []).filter((m) => {
    if (idsCadastrados.has(norm(m.hostname))) return false
    const s = serialUtil(m.numeroSerie)
    return !(s && seriaisCadastrados.has(s))
  })
}

// Bytes -> texto curto do jeito que o cadastro guarda ("16 GB", "512 GB").
// Base 1024 arredondada para o tamanho comercial: um pente de 8 GiB é
// vendido como "8 GB", e é assim que a pessoa preencheria à mão.
function gb(bytes) {
  if (!bytes) return null
  const v = bytes / 1024 ** 3
  // Abaixo de 1 TB arredonda pro inteiro mais próximo; acima, mostra em TB.
  if (v >= 1000) return `${Math.round(v / 1024)} TB`
  return `${Math.round(v)} GB`
}

// Converte o que o agente detectou para os campos do formulário de ativo
// (ver FIELD_GROUPS.Desktop em constants/fieldGroups.js). Só os campos que
// o agente realmente sabe — unidade, departamento e usuário responsável
// continuam sendo decisão de quem cadastra.
export function camposDetectados(maquina) {
  if (!maquina) return {}

  const modelo = [maquina.fabricante, maquina.modelo].filter(Boolean).join(' ')

  // Armazenamento: tipo de mídia junto do tamanho ("512 GB SSD"), que é o
  // que interessa na hora de decidir troca de máquina.
  const tipos = [...new Set((maquina.discos ?? []).map((d) => d.tipoMidia).filter(Boolean))]
  const tamanho = gb(maquina.discoTotalBytes)
  const armazenamento = [tamanho, tipos.join(' + ')].filter(Boolean).join(' ') || null

  // Usuário de rede: o agente reporta DOMINIO\usuario; o cadastro guarda
  // só o login.
  const ad = maquina.usuarioLogado ? maquina.usuarioLogado.split('\\').pop() : null

  return {
    modelo: modelo || null,
    processador: maquina.cpuModelo,
    ram: gb(maquina.ramTotalBytes),
    armazenamento,
    so: maquina.soNome,
    serial: serialUtil(maquina.numeroSerie) ? maquina.numeroSerie : null,
    ad,
  }
}

// Campos detectados que ainda estão VAZIOS no cadastro. É o que o botão
// "preencher com o detectado" vai gravar — nunca sobrescreve o que uma
// pessoa digitou, porque o valor digitado pode ser uma correção
// deliberada do que o agente lê errado.
export function camposParaPreencher(ativo, maquina) {
  const detectado = camposDetectados(maquina)
  const faltando = {}
  for (const [campo, valor] of Object.entries(detectado)) {
    if (!valor) continue
    const atual = ativo?.[campo]
    if (!atual || !String(atual).trim()) faltando[campo] = valor
  }
  return faltando
}
