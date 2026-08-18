// Publica a versão atual do agente para que as máquinas do parque se
// atualizem sozinhas — ver autoUpdate.js para o lado que consome.
//
// Uso (na pasta agent/, com o .env preenchido):
//   node publicar.js            publica a versão de inventory.js
//   node publicar.js --dry-run  mostra o que seria publicado, sem gravar
//   node publicar.js --status   mostra a versão publicada e a do parque
//   node publicar.js --remover  cancela a publicação (para o rollout)
//
// Publicar NÃO reinstala nada: só troca os arquivos .js do agente. Node,
// RustDesk e a tarefa agendada continuam sendo assunto do instalador.
import 'dotenv/config'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { AGENTE_VERSAO } from './inventory.js'

const UPDATE_KEY = 'gmad_agente_inventario_release'
const ARQUIVOS = ['inventory.js', 'inventario.js', 'autoUpdate.js']

const PASTA = path.dirname(fileURLToPath(import.meta.url))
const DRY_RUN = process.argv.includes('--dry-run')
const STATUS = process.argv.includes('--status')
const REMOVER = process.argv.includes('--remover')

function log(msg) {
  console.log(`[publicar] ${msg}`)
}

async function conectar() {
  const { SUPABASE_URL, SUPABASE_ANON_KEY, AGENT_EMAIL, AGENT_PASSWORD } = process.env
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !AGENT_EMAIL || !AGENT_PASSWORD) {
    throw new Error(
      'Faltam variáveis no .env (SUPABASE_URL, SUPABASE_ANON_KEY, AGENT_EMAIL, AGENT_PASSWORD).',
    )
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { error } = await sb.auth.signInWithPassword({
    email: AGENT_EMAIL,
    password: AGENT_PASSWORD,
  })
  if (error) throw new Error(`falha ao autenticar: ${error.message}`)
  return sb
}

// Compara a versão publicada com a que cada máquina está rodando — é como
// se acompanha um rollout sem ir de PC em PC.
async function mostrarStatus(sb) {
  const { data } = await sb
    .from('kv_store')
    .select('value, updated_at')
    .eq('key', UPDATE_KEY)
    .maybeSingle()
  const publicada = data?.value?.versao
  log(
    publicada
      ? `versão publicada: ${publicada} (em ${data.updated_at})`
      : 'nenhuma versão publicada',
  )
  log(`versão nesta pasta: ${AGENTE_VERSAO}`)

  const { data: maquinas } = await sb
    .from('host_inventory')
    .select('hostname, agente_versao, coletado_em')
    .order('agente_versao')
  if (!maquinas?.length) return

  const porVersao = new Map()
  for (const m of maquinas) {
    const v = m.agente_versao ?? '(desconhecida)'
    porVersao.set(v, (porVersao.get(v) ?? 0) + 1)
  }
  console.log('')
  log(`parque (${maquinas.length} máquinas):`)
  for (const [versao, qtd] of [...porVersao].sort()) {
    const marca = versao === publicada ? '  <- publicada' : ''
    console.log(`   v${versao}: ${qtd} máquina(s)${marca}`)
  }

  const desatualizadas = maquinas.filter((m) => publicada && m.agente_versao !== publicada)
  if (desatualizadas.length) {
    console.log('')
    log('ainda não atualizadas (atualizam na próxima coleta de cada uma):')
    desatualizadas.forEach((m) => console.log(`   ${m.hostname} (v${m.agente_versao})`))
  }
}

async function main() {
  const sb = await conectar()

  if (STATUS) return mostrarStatus(sb)

  if (REMOVER) {
    // Remove a publicação: as máquinas param de atualizar e ficam na
    // versão que têm. É o freio de emergência quando uma versão publicada
    // se revela problemática — sem isso, a única saída seria publicar
    // outra correção às pressas.
    if (DRY_RUN) return log('--dry-run: a publicação seria removida.')
    const { error } = await sb.from('kv_store').delete().eq('key', UPDATE_KEY)
    if (error) throw new Error(error.message)
    return log('publicação removida. As máquinas mantêm a versão atual.')
  }

  const arquivos = []
  for (const nome of ARQUIVOS) {
    const conteudo = await fs.readFile(path.join(PASTA, nome), 'utf8')
    arquivos.push({
      nome,
      conteudo,
      // Guardado para conferência humana e para o dia em que o pacote for
      // assinado — hoje o autoUpdate valida forma e tamanho, não o hash.
      sha256: createHash('sha256').update(conteudo).digest('hex'),
    })
  }

  const pacote = {
    versao: AGENTE_VERSAO,
    publicadoEm: new Date().toISOString(),
    arquivos,
  }

  const tamanhoKb = Math.round(JSON.stringify(pacote).length / 1024)
  log(`versão ${AGENTE_VERSAO} — ${arquivos.length} arquivos, ${tamanhoKb} KB`)
  arquivos.forEach((a) =>
    console.log(
      `   ${a.nome.padEnd(16)} ${String(Math.round(a.conteudo.length / 1024)).padStart(3)} KB  sha256:${a.sha256.slice(0, 12)}`,
    ),
  )

  if (DRY_RUN) return log('--dry-run: nada foi publicado.')

  // Sem compare-and-swap aqui: publicar é ação deliberada de uma pessoa
  // por vez, não há concorrência a resolver como no cadastro de ativos.
  const { error } = await sb
    .from('kv_store')
    .upsert({ key: UPDATE_KEY, value: pacote, updated_at: new Date().toISOString() })
  if (error) throw new Error(`falha ao publicar: ${error.message}`)

  console.log('')
  log(`publicada. Cada máquina atualiza na próxima coleta (logon ou coleta diária).`)
  log('Acompanhe com: node publicar.js --status')
}

main().catch((e) => {
  console.error(`[publicar] erro: ${e.message}`)
  process.exit(1)
})
