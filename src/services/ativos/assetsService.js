import { kvGet, kvGetWithMeta, kvSet } from '../supabase/kvStore'
import { downloadCsv } from '../export/csvExport'

const DATA_KEY = 'gmad_ativos_data'

const CSV_COLUMNS = [
  'id',
  'categoria',
  'unidade',
  'departamento',
  'vendaTipo',
  'almoxarifadoArea',
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
  'finalidade',
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

// Igual a getAssets, mas inclui o `updated_at` da linha — usado pelas
// mutações pra ler o valor mais recente do banco (não o do cache local) e
// gravar de forma condicional (ver saveAssets).
export async function getAssetsWithMeta() {
  return kvGetWithMeta(DATA_KEY)
}

// Grava a lista completa de ativos — o kv_store guarda o array inteiro sob
// uma única chave, então toda escrita reescreve a lista completa (mesmo
// padrão do saveData() original). `expectedUpdatedAt`: quando informado, a
// gravação é condicional (compare-and-swap) — ver kvSet.
export async function saveAssets(assets, expectedUpdatedAt) {
  await kvSet(DATA_KEY, assets, { expectedUpdatedAt })
}

// Exporta a lista filtrada atual para CSV (mesmas colunas do exportCsv() original).
export function exportAssetsCsv(assets) {
  const filename = `ativos_ti_gmad_${new Date().toISOString().slice(0, 10)}.csv`
  downloadCsv(filename, CSV_COLUMNS, assets)
}
