import { kvGet, kvSet } from '../supabase/kvStore'
import { downloadCsv } from '../export/csvExport'

const DATA_KEY = 'gmad_ativos_data'

const CSV_COLUMNS = [
  'id',
  'categoria',
  'unidade',
  'departamento',
  'usuario',
  'ad',
  'modelo',
  'processador',
  'ram',
  'armazenamento',
  'so',
  'pcVinculado',
  'tamanho',
  'resolucao',
  'conexoes',
  'serial',
  'fabricacao',
  'codModelo',
  'imei1',
  'imei2',
  'nf',
  'tipoImpressao',
  'conexao',
  'ip',
  'suprimento',
  'dataAquisicao',
  'garantiaAte',
  'preco',
  'status',
  'etiqueta',
]

// Lê a lista de ativos do kv_store.
export async function getAssets() {
  return kvGet(DATA_KEY)
}

// Grava a lista completa de ativos — o kv_store guarda o array inteiro sob
// uma única chave, então toda escrita reescreve a lista completa (mesmo
// padrão do saveData() original).
export async function saveAssets(assets) {
  await kvSet(DATA_KEY, assets)
}

// Exporta a lista filtrada atual para CSV (mesmas colunas do exportCsv() original).
export function exportAssetsCsv(assets) {
  const filename = `ativos_ti_gmad_${new Date().toISOString().slice(0, 10)}.csv`
  downloadCsv(filename, CSV_COLUMNS, assets)
}
