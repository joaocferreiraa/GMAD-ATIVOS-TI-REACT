import { kvGet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_scripts_data'

// Leitura da lista de scripts do kv_store — a tela de Scripts em si ainda
// não foi migrada (Etapa futura); este service existe apenas para
// alimentar o relatório "Scripts" da Central de Relatórios.
export async function getScripts() {
  return kvGet(DATA_KEY)
}
