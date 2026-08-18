import { supabase } from '../supabase/client'

// Inventário das máquinas do parque, coletado pelo agente (ver
// agent/inventory.js) — tabela host_inventory, ver
// supabase/migrations/0008_host_inventory.sql.
//
// Exceção ao padrão kv_store do projeto, pela mesma razão já documentada em
// measurementsService.js/hostMetricsService.js: são 60+ agentes gravando de
// forma independente, e o kv_store reescreve a lista inteira a cada
// gravação (com compare-and-swap) — aqui a maioria das coletas simultâneas
// falharia por conflito. Com tabela relacional, cada agente escreve só a
// própria linha.

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      'Supabase não configurado: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em .env.local.',
    )
  }
  return supabase
}

// numeric/bigint do Postgres chegam como string no supabase-js (pra não
// perder precisão); a tela precisa de number. null continua null.
function num(v) {
  return v === null || v === undefined ? null : Number(v)
}

function lista(v) {
  return Array.isArray(v) ? v : []
}

function rowToMachine(r) {
  return {
    machineUid: r.machine_uid,
    hostname: r.hostname,
    dominio: r.dominio,
    usuarioLogado: r.usuario_logado,
    fabricante: r.fabricante,
    modelo: r.modelo,
    numeroSerie: r.numero_serie,
    tipoChassi: r.tipo_chassi,
    soNome: r.so_nome,
    soVersao: r.so_versao,
    soBuild: r.so_build,
    soArquitetura: r.so_arquitetura,
    soInstaladoEm: r.so_instalado_em,
    cpuModelo: r.cpu_modelo,
    cpuFabricante: r.cpu_fabricante,
    cpuNucleos: num(r.cpu_nucleos),
    cpuThreads: num(r.cpu_threads),
    cpuClockMhz: num(r.cpu_clock_mhz),
    ramTotalBytes: num(r.ram_total_bytes),
    ramSlotsUsados: num(r.ram_slots_usados),
    ramSlotsTotais: num(r.ram_slots_totais),
    ramPentes: lista(r.ram_pentes),
    discos: lista(r.discos),
    discoTotalBytes: num(r.disco_total_bytes),
    discoLivreBytes: num(r.disco_livre_bytes),
    gpus: lista(r.gpus),
    adaptadoresRede: lista(r.adaptadores_rede),
    softwares: lista(r.softwares),
    rustdeskId: r.rustdesk_id,
    rustdeskInstalado: r.rustdesk_instalado,
    agenteVersao: r.agente_versao,
    coletadoEm: r.coletado_em,
    criadoEm: r.criado_em,
  }
}

// Todas as máquinas inventariadas, da coleta mais recente pra mais antiga.
// Sem paginação de propósito: é uma linha por máquina (dezenas, não
// milhares) — ver o comentário de topo em 0008_host_inventory.sql.
//
// A lista de softwares é excluída aqui: numa máquina comum são ~60
// programas, e trazer isso de 60+ máquinas de uma vez só pra montar a
// tabela seriam megabytes de JSON que a tela nem mostra. A ficha de uma
// máquina busca à parte, via getMachineSoftware.
export async function getInventory() {
  const { data, error } = await requireSupabase()
    .from('host_inventory')
    .select(
      'machine_uid, hostname, dominio, usuario_logado, fabricante, modelo, numero_serie, ' +
        'tipo_chassi, so_nome, so_versao, so_build, so_arquitetura, so_instalado_em, ' +
        'cpu_modelo, cpu_fabricante, cpu_nucleos, cpu_threads, cpu_clock_mhz, ' +
        'ram_total_bytes, ram_slots_usados, ram_slots_totais, ram_pentes, ' +
        'discos, disco_total_bytes, disco_livre_bytes, gpus, adaptadores_rede, ' +
        'rustdesk_id, rustdesk_instalado, agente_versao, coletado_em, criado_em',
    )
    .order('coletado_em', { ascending: false })
  if (error) throw error
  return data.map(rowToMachine)
}

// Softwares de UMA máquina — buscado só quando a ficha é aberta, pela razão
// explicada em getInventory.
export async function getMachineSoftware(machineUid) {
  const { data, error } = await requireSupabase()
    .from('host_inventory')
    .select('softwares')
    .eq('machine_uid', machineUid)
    .single()
  if (error) throw error
  return lista(data?.softwares)
}

// Remove uma máquina do inventário (PC desativado/vendido). Via RPC pelo
// mesmo motivo do upsert — o contrato fica no banco, ver
// remover_host_inventory em 0008_host_inventory.sql.
export async function removeMachine(machineUid) {
  const { error } = await requireSupabase().rpc('remover_host_inventory', {
    p_machine_uid: machineUid,
  })
  if (error) throw error
}

// --- Histórico de mudanças ------------------------------------------------
// Tabela host_inventory_changes (ver 0010_host_inventory_historico.sql): o
// que mudou em cada máquina desde a coleta anterior. É o que revela o que
// ninguém contou ao TI — pente de RAM retirado, disco trocado, programa
// instalado sem autorização, máquina que mudou de dono.

function rowToChange(r) {
  return {
    id: r.id,
    machineUid: r.machine_uid,
    hostname: r.hostname,
    campo: r.campo,
    valorAnterior: r.valor_anterior,
    valorNovo: r.valor_novo,
    tipo: r.tipo,
    severidade: r.severidade,
    createdAt: r.created_at,
  }
}

// Mudanças recentes do parque inteiro, da mais nova para a mais antiga.
// `limite` existe porque software instalado em 60 máquinas pode gerar
// muitas linhas de uma vez — a tela mostra as últimas, não o histórico
// completo de dois anos.
export async function getInventoryChanges({ machineUid = null, limite = 200 } = {}) {
  let query = requireSupabase()
    .from('host_inventory_changes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limite)
  if (machineUid) query = query.eq('machine_uid', machineUid)
  const { data, error } = await query
  if (error) throw error
  return data.map(rowToChange)
}
