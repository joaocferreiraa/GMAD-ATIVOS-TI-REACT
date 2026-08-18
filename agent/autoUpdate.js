// Auto-atualização do agente: busca no Supabase uma versão mais nova dos
// próprios arquivos .js e a instala para a PRÓXIMA execução.
//
// POR QUE ISSO EXISTE:
// sem auto-update, corrigir um bug do coletor exige passar nas 60+ máquinas
// reinstalando o pacote. A correção de hoje (programas instalados por
// usuário, invisíveis até então) é exatamente esse caso — e um parque onde
// atualizar dói é um parque que fica desatualizado.
//
// O QUE ESTE MECANISMO **NÃO** FAZ, de propósito:
// não troca Node, RustDesk nem a tarefa agendada — só os arquivos .js do
// próprio agente. Mexer em runtime, serviço e agendamento é trabalho do
// instalador, que roda com um humano por perto; um agente que se
// reconfigura sozinho pode se desligar sozinho e ninguém fica sabendo.
//
// SEGURANÇA — leia antes de mexer:
// isto é, por construção, execução remota de código. Quem escrever no
// kv_store roda o que quiser como SYSTEM em todas as máquinas. As defesas
// abaixo reduzem o estrago de um pacote corrompido ou malformado, mas a
// proteção real é o RLS do Supabase: só sessão autenticada escreve, e a
// conta do agente deveria ter permissão de LEITURA nessa chave. Se um dia
// isso virar alvo, o passo seguinte é assinar o pacote (Ed25519, chave
// pública embutida no instalador) — o formato já reserva o campo `sha256`
// pensando nisso.
import path from 'node:path'
import fs from 'node:fs/promises'
import { AGENTE_VERSAO } from './inventory.js'

// Chave no kv_store onde o painel publica a versão corrente. Mesmo
// mecanismo que o agente de rede usa para ler os pontos monitorados (ver
// index.js, MONITORS_KEY) — nada de infraestrutura nova.
const UPDATE_KEY = 'gmad_agente_inventario_release'

// Arquivos que o auto-update pode substituir. Lista fixa e explícita:
// um pacote não escolhe onde escreve, então nem um `..\\..\\system32\\`
// no nome nem um arquivo extra inesperado chegam ao disco.
const ARQUIVOS_PERMITIDOS = new Set(['inventory.js', 'inventario.js', 'autoUpdate.js'])

// Teto de tamanho por arquivo. Os reais têm ~21 KB; 512 KB é folga larga
// para crescimento honesto e barreira contra um payload absurdo.
const TAMANHO_MAXIMO = 512 * 1024

function log(msg) {
  console.log(`[atualizacao] ${msg}`)
}

// Compara versões no formato x.y.z. Devolve true se `nova` for maior.
// Comparação numérica por componente, não alfabética: '1.10.0' é maior que
// '1.9.0', o que uma comparação de strings erraria.
export function versaoMaior(nova, atual) {
  const parse = (v) =>
    String(v ?? '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0)
  const a = parse(nova)
  const b = parse(atual)
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] ?? 0
    const y = b[i] ?? 0
    if (x > y) return true
    if (x < y) return false
  }
  return false
}

// Confere se o pacote tem forma válida ANTES de escrever qualquer coisa em
// disco. Um pacote parcialmente aplicado deixaria o agente sem coletar até
// alguém ir na máquina — o que é pior que não atualizar.
function validarPacote(pacote) {
  if (!pacote || typeof pacote !== 'object') return 'formato inválido'
  if (!/^\d+(\.\d+){0,3}$/.test(String(pacote.versao ?? ''))) return 'versão ausente ou inválida'
  if (!Array.isArray(pacote.arquivos) || !pacote.arquivos.length) return 'sem arquivos'

  for (const arquivo of pacote.arquivos) {
    const nome = arquivo?.nome
    if (!ARQUIVOS_PERMITIDOS.has(nome)) return `arquivo não permitido: ${nome}`
    if (typeof arquivo.conteudo !== 'string' || !arquivo.conteudo.trim()) {
      return `conteúdo vazio em ${nome}`
    }
    if (arquivo.conteudo.length > TAMANHO_MAXIMO) return `${nome} excede o tamanho máximo`
    // O agente é ESM e todo arquivo dele importa ou exporta algo. Um
    // pacote que não parece JavaScript de módulo é lixo ou engano.
    if (!/\b(import|export)\b/.test(arquivo.conteudo)) return `${nome} não parece um módulo ESM`
  }
  return null
}

// Aplica o pacote. Escreve em arquivo temporário e só então renomeia: se a
// máquina desligar no meio da gravação, o agente antigo continua íntegro
// em vez de virar um arquivo pela metade que não carrega.
async function aplicar(pacote, pastaAgente) {
  const escritos = []
  try {
    for (const arquivo of pacote.arquivos) {
      const destino = path.join(pastaAgente, arquivo.nome)
      const temporario = `${destino}.novo`
      await fs.writeFile(temporario, arquivo.conteudo, 'utf8')
      await fs.rename(temporario, destino)
      escritos.push(arquivo.nome)
    }
    return escritos
  } catch (e) {
    throw new Error(`falha ao gravar ${escritos.length + 1}º arquivo: ${e.message}`)
  }
}

// Verifica e aplica atualização, se houver. Devolve a versão nova quando
// atualizou, null quando não havia nada a fazer.
//
// NUNCA lança: uma falha aqui (rede fora, JSON malformado, disco cheio,
// pacote adulterado) não pode impedir a coleta do dia. O agente antigo
// continua funcionando e tenta de novo na próxima execução — é a mesma
// postura do resto do agente, de nunca deixar um problema secundário
// derrubar o trabalho principal.
export async function verificarAtualizacao(supabase, pastaAgente) {
  try {
    const { data, error } = await supabase
      .from('kv_store')
      .select('value')
      .eq('key', UPDATE_KEY)
      .maybeSingle()

    // maybeSingle (não single): a chave não existir é o estado normal de
    // quem nunca publicou uma atualização, não um erro.
    if (error) {
      log(`não foi possível consultar atualizações: ${error.message}`)
      return null
    }
    const pacote = data?.value
    if (!pacote) return null

    if (!versaoMaior(pacote.versao, AGENTE_VERSAO)) return null

    const problema = validarPacote(pacote)
    if (problema) {
      // Recusa ruidosa: um pacote inválido publicado por engano precisa
      // aparecer no log de quem for investigar por que o parque não
      // atualizou.
      log(`RECUSADA a versão ${pacote.versao}: ${problema}`)
      return null
    }

    log(`atualizando de ${AGENTE_VERSAO} para ${pacote.versao}...`)
    const escritos = await aplicar(pacote, pastaAgente)
    log(`atualizado: ${escritos.join(', ')}. A nova versão passa a valer na próxima coleta.`)

    // A coleta ATUAL segue com o código já carregado em memória: trocar de
    // versão no meio da execução misturaria dois códigos diferentes. A
    // próxima execução (logon ou coleta diária) usa o novo.
    return pacote.versao
  } catch (e) {
    log(`falha ao atualizar (a coleta continua normalmente): ${e.message}`)
    return null
  }
}
