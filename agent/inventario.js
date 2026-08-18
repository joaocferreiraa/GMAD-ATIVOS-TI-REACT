// Ponto de entrada do INVENTÁRIO — roda, coleta as specs da máquina, grava
// no Supabase e ENCERRA. Diferente de index.js (agente de rede), que fica
// residente: aqui não há nada pra vigiar continuamente, specs de hardware
// mudam quando alguém abre a máquina. Por isso é tarefa agendada, não
// serviço — ver agent/README-INVENTARIO.md pra instalar em escala.
//
// Uso:
//   node inventario.js            grava no Supabase
//   node inventario.js --dry-run  só imprime o que coletou (não grava)
import 'dotenv/config'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'
import { collectInventory, AGENTE_VERSAO } from './inventory.js'
import { verificarAtualizacao } from './autoUpdate.js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY
const AGENT_EMAIL = process.env.AGENT_EMAIL
const AGENT_PASSWORD = process.env.AGENT_PASSWORD

const DRY_RUN = process.argv.includes('--dry-run')

// Espalha o início da coleta num intervalo aleatório. Com 60+ máquinas
// ligando no mesmo horário de expediente e a tarefa disparando no logon,
// todas bateriam no Supabase praticamente juntas — um pico desnecessário
// contra um projeto que atende também o painel. Cada máquina sorteia seu
// próprio atraso, então a carga se distribui sozinha sem coordenação
// central. Em execução manual (--dry-run ou INVENTARIO_SEM_ATRASO=1) não
// há espera: quem está testando quer resposta na hora.
const ATRASO_MAXIMO_MS =
  Math.max(parseInt(process.env.INVENTARIO_ATRASO_MAXIMO_SEGUNDOS ?? '120', 10) || 0, 0) * 1000

function log(msg) {
  console.log(`[inventario] ${new Date().toISOString()} ${msg}`)
}

function erro(msg) {
  console.error(`[inventario] ${new Date().toISOString()} ${msg}`)
}

async function esperarAtrasoAleatorio() {
  if (DRY_RUN || process.env.INVENTARIO_SEM_ATRASO === '1' || ATRASO_MAXIMO_MS <= 0) return
  const ms = Math.floor(Math.random() * ATRASO_MAXIMO_MS)
  log(`aguardando ${Math.round(ms / 1000)}s antes de coletar (evita pico simultâneo no servidor)`)
  await new Promise((r) => setTimeout(r, ms))
}

async function main() {
  log(`agente de inventário v${AGENTE_VERSAO}`)

  if (!DRY_RUN && (!SUPABASE_URL || !SUPABASE_ANON_KEY || !AGENT_EMAIL || !AGENT_PASSWORD)) {
    erro(
      'Faltam variáveis de ambiente. Copie .env.example para .env e preencha ' +
        'SUPABASE_URL, SUPABASE_ANON_KEY, AGENT_EMAIL e AGENT_PASSWORD. ' +
        '(Use --dry-run para testar a coleta sem gravar.)',
    )
    process.exit(1)
  }

  await esperarAtrasoAleatorio()

  log('coletando inventário da máquina...')
  const inventario = await collectInventory()
  log(
    `coletado: ${inventario.hostname} | ${inventario.fabricante ?? '—'} ${inventario.modelo ?? '—'} | ` +
      `${inventario.cpuModelo ?? '—'} | ${inventario.softwares.length} programa(s)`,
  )

  if (DRY_RUN) {
    console.log(JSON.stringify(inventario, null, 2))
    log('--dry-run: nada foi gravado.')
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    // Sem persistência de sessão: o processo encerra em seguida, e gravar
    // token em disco na máquina do usuário é superfície de risco à toa.
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error: erroLogin } = await supabase.auth.signInWithPassword({
    email: AGENT_EMAIL,
    password: AGENT_PASSWORD,
  })
  if (erroLogin) throw new Error(`falha ao autenticar: ${erroLogin.message}`)

  // Auto-atualização ANTES de gravar, mas DEPOIS de coletar: assim uma
  // versão nova publicada hoje já vale na próxima execução, e a coleta de
  // agora acontece de qualquer jeito — mesmo que a atualização falhe.
  // Ver autoUpdate.js.
  await verificarAtualizacao(supabase, path.dirname(fileURLToPath(import.meta.url)))

  // Via RPC (não upsert direto na tabela) pra preservar `criado_em` na
  // atualização — ver upsert_host_inventory em
  // supabase/migrations/0008_host_inventory.sql.
  const { error } = await supabase.rpc('upsert_host_inventory', { dados: inventario })
  if (error) {
    // Função ausente é o erro esperado de quem atualizou o agente antes do
    // banco — vale uma instrução, não só a mensagem crua do Postgres.
    if (error.message?.includes('upsert_host_inventory')) {
      throw new Error(
        `${error.message}\n         Rode supabase/migrations/0008_host_inventory.sql no SQL Editor do Supabase.`,
      )
    }
    throw new Error(`falha ao gravar inventário: ${error.message}`)
  }

  log(`inventário gravado (machine_uid: ${inventario.machineUid}).`)
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    erro(`erro fatal: ${e.message}`)
    // Código != 0 faz o Agendador de Tarefas registrar a execução como
    // falha, que é como se descobre uma máquina com problema sem abrir log
    // uma a uma.
    process.exit(1)
  })
