import { kvGet } from '../supabase/kvStore'

const DATA_KEY = 'gmad_instaladores_data'

// Leitura da lista de instaladores do kv_store — a tela de Instaladores em
// si ainda não foi migrada (Etapa futura); este service existe apenas para
// alimentar o relatório "Instaladores" da Central de Relatórios.
export async function getInstaladores() {
  return kvGet(DATA_KEY)
}
