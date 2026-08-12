import { unitDisplayName, assetWarrantyInfo } from './formatters'

function attentionReason(asset) {
  if (asset.status === 'Manutenção') return 'manutencao'
  const cls = assetWarrantyInfo(asset).cls
  if (cls === 'expired') return 'garantia-expired'
  if (cls === 'warn') return 'garantia-warn'
  if (cls === 'missing') return 'garantia-missing'
  return null
}

// Ativos que "requerem atenção": em manutenção, com garantia vencendo/vencida
// ou sem garantia cadastrada (respeitando a exceção das impressoras —
// assetWarrantyInfo só considera "sem garantia" quando de fato se aplica).
// Sem limite — quem consome decide como paginar/agrupar (Dashboard mostra um
// item por ativo; o sino de notificações agrupa "sem garantia" numa contagem).
export function getAttentionItems(assets) {
  return assets
    .map((a) => ({ asset: a, reason: attentionReason(a) }))
    .filter((x) => x.reason)
    .map(({ asset: a, reason }) => ({
      id: a.uid,
      title: `${a.id} · ${a.usuario || unitDisplayName(a.unidade) || ''}`,
      subtitle: reason === 'manutencao' ? 'Em manutenção' : assetWarrantyInfo(a).label,
      status: a.status || 'Ativo',
      reason,
    }))
}

// Lista "Requer atenção" do Dashboard: um item por ativo, capado em `limit`.
// "Sem garantia" fica de fora — já tem contagem própria nos mini-stats do
// mesmo card, listar cada ativo aqui também seria repetir a mesma informação.
export function buildAttentionList(assets, limit = 8) {
  return getAttentionItems(assets)
    .filter((item) => item.reason !== 'garantia-missing')
    .slice(0, limit)
}
