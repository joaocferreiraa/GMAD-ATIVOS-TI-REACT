// Varre a rede em busca de equipamentos que NÃO rodam o agente
// (impressoras, câmeras, switches, nobreaks) e grava o que encontrou.
//
// Roda no MESMO servidor do agente de rede (index.js), não nas estações:
// varredura precisa de um ponto fixo dentro da rede, e disparar isso de
// 60 máquinas ao mesmo tempo seria ruído inútil — além de parecer ataque
// para qualquer firewall.
//
// Uso:
//   node descobrir.js                       varre os IPs já cadastrados no painel
//   node descobrir.js 172.25.251.0/24       varre uma faixa
//   node descobrir.js 172.25.251.1-120      idem, formato de intervalo
//   node descobrir.js --dry-run <faixa>     mostra o que achou, sem gravar
import 'dotenv/config'
import { createClient } from '@supabase/supabase-js'
import { sondarLista, expandirFaixa } from './networkDiscovery.js'

const DRY_RUN = process.argv.includes('--dry-run')
const COMUNIDADE_SNMP = process.env.SNMP_COMUNIDADE || 'public'

const argumentos = process.argv.slice(2).filter((a) => !a.startsWith('--'))

function log(msg) {
  console.log(`[descoberta] ${new Date().toISOString()} ${msg}`)
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

// Sem faixa informada, varre o que o painel já conhece: os IPs cadastrados
// nos ativos (impressoras, principalmente) e os pontos monitorados.
//
// É o padrão certo para uso agendado: confirma que o que está cadastrado
// continua no ar e atualiza modelo/portas, sem varrer a rede inteira todo
// dia — varredura ampla é operação deliberada, não rotina.
async function ipsCadastrados(sb) {
  const ips = new Set()

  const { data: ativos } = await sb
    .from('kv_store')
    .select('value')
    .eq('key', 'gmad_ativos_data')
    .maybeSingle()
  for (const a of ativos?.value ?? []) {
    if (a?.ip && /^\d+\.\d+\.\d+\.\d+$/.test(String(a.ip).trim())) ips.add(String(a.ip).trim())
  }

  const { data: monitores } = await sb
    .from('kv_store')
    .select('value')
    .eq('key', 'gmad_network_monitors')
    .maybeSingle()
  for (const m of monitores?.value ?? []) {
    if (m?.host && /^\d+\.\d+\.\d+\.\d+$/.test(String(m.host).trim()))
      ips.add(String(m.host).trim())
  }

  // Equipamentos já descobertos antes: continuam sendo verificados mesmo
  // que ninguém os tenha cadastrado — senão sumiriam do radar depois da
  // primeira varredura ampla.
  const { data: conhecidos } = await sb.from('network_devices').select('ip')
  for (const d of conhecidos ?? []) ips.add(d.ip)

  return [...ips]
}

// Escolhe de onde veio a identificação do modelo — para a tela poder
// mostrar o quanto confiar nela (SNMP é o mais confiável; título de página
// web é palpite educado).
function identificacao(achado) {
  if (achado.snmpDescricao) return { modelo: achado.snmpDescricao, origem: 'snmp' }

  // Câmera que respondeu a consulta específica: fabricante + série é uma
  // identificação melhor que o título da página (que nessas câmeras vem
  // vazio), então vem antes do HTTP.
  if (achado.fabricante || achado.serie) {
    return {
      modelo: [achado.fabricante, achado.serie].filter(Boolean).join(' '),
      origem: 'api',
    }
  }

  // PJL vem antes do cabeçalho HTTP: a impressora respondendo o próprio
  // modelo é mais confiável que o nome do servidor web embarcado.
  if (achado.modeloPjl) return { modelo: achado.modeloPjl, origem: 'pjl' }
  if (achado.httpTitulo) return { modelo: achado.httpTitulo, origem: 'http' }
  if (achado.httpServidor) return { modelo: achado.httpServidor, origem: 'http' }
  if (achado.nomeDns) return { modelo: achado.nomeDns, origem: 'dns' }
  // Assinatura do HTML é o último recurso: diz a família, não o aparelho.
  if (achado.httpAssinatura) return { modelo: achado.httpAssinatura, origem: 'http' }
  return { modelo: null, origem: null }
}

// IPs que o agente de inventário já reporta. Uma máquina Windows com o
// agente instalado NÃO precisa aparecer na lista de equipamentos de rede:
// lá se sabe tudo dela (RAM, disco, programas), aqui só se veria "responde
// ping". Duplicar confunde a contagem e enche a tela de nomes que já estão
// na aba de máquinas.
async function ipsDoInventario(sb) {
  const { data } = await sb.from('host_inventory').select('adaptadores_rede')
  const ips = new Set()
  for (const m of data ?? []) {
    for (const adaptador of m.adaptadores_rede ?? []) {
      for (const ip of adaptador.ips ?? []) ips.add(ip)
    }
  }
  return ips
}

async function main() {
  const sb = DRY_RUN && argumentos.length ? null : await conectar()

  let alvos = []
  if (argumentos.length) {
    for (const faixa of argumentos) alvos.push(...expandirFaixa(faixa))
    log(`varrendo ${alvos.length} endereço(s) de ${argumentos.join(', ')}`)
  } else {
    if (!sb)
      throw new Error(
        'Sem faixa informada, é preciso conectar ao Supabase para ler os IPs cadastrados.',
      )
    alvos = await ipsCadastrados(sb)
    if (!alvos.length) {
      log('nenhum IP cadastrado no painel. Informe uma faixa: node descobrir.js 172.25.251.0/24')
      return
    }
    log(`verificando ${alvos.length} endereço(s) já conhecidos pelo painel`)
  }

  const inicio = Date.now()
  let ultimoAviso = 0
  const achados = await sondarLista(alvos, {
    comunidadeSnmp: COMUNIDADE_SNMP,
    aoProgredir: (concluidos) => {
      // Aviso a cada 25%: varredura de /24 leva dezenas de segundos, e
      // silêncio total parece travamento.
      const pct = Math.floor((concluidos / alvos.length) * 4)
      if (pct > ultimoAviso) {
        ultimoAviso = pct
        log(`${concluidos}/${alvos.length} verificados...`)
      }
    },
  })

  const segundos = ((Date.now() - inicio) / 1000).toFixed(0)
  log(`${achados.length} equipamento(s) encontrado(s) em ${segundos}s`)

  const porTipo = {}
  for (const a of achados) porTipo[a.tipo] = (porTipo[a.tipo] ?? 0) + 1
  for (const [tipo, n] of Object.entries(porTipo).sort((x, y) => y[1] - x[1])) {
    console.log(`   ${String(n).padStart(3)}  ${tipo}`)
  }

  // Descarta o que o agente de inventário já cobre — ver ipsDoInventario.
  const jaInventariados = sb ? await ipsDoInventario(sb) : new Set()
  const paraGravar = achados.filter((a) => !jaInventariados.has(a.host))
  const descartados = achados.length - paraGravar.length
  if (descartados) {
    log(
      `${descartados} já aparecem no inventário de máquinas (agente instalado) — não duplicados aqui`,
    )
  }

  const registros = paraGravar.map((a) => {
    const { modelo, origem } = identificacao(a)
    return {
      ip: a.host,
      tipo: a.tipo,
      nomeDns: a.nomeDns,
      modelo,
      identificacaoOrigem: origem,
      local: a.snmpLocal,
      mac: a.mac,
      serie: a.serie,
      portas: a.portas,
      respondePing: a.respondeuPing,
    }
  })

  if (DRY_RUN) {
    console.log('')
    registros.forEach((r) =>
      console.log(`   ${r.ip.padEnd(16)} ${String(r.tipo).padEnd(20)} ${r.modelo ?? ''}`),
    )
    log('--dry-run: nada foi gravado.')
    return
  }

  const { error } = await sb.rpc('upsert_network_devices', { dados: registros })
  if (error) {
    if (error.message?.includes('upsert_network_devices')) {
      throw new Error(
        `${error.message}\n         Rode supabase/migrations/0011_network_devices.sql no SQL Editor do Supabase.`,
      )
    }
    throw new Error(`falha ao gravar: ${error.message}`)
  }
  log('gravado no painel.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(`[descoberta] erro: ${e.message}`)
    process.exit(1)
  })
