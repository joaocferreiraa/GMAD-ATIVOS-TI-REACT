import { useMemo } from 'react'
import { useAssets } from './data/useAssets'
import { getAttentionItems } from '../utils/attention'
import { assetWarrantyInfo } from '../utils/formatters'

const MAX_ITEMS = 6

// Alimenta o sino de notificações da Topbar com os mesmos itens do
// "Requer atenção" do Dashboard, mas com "sem garantia" agrupado numa única
// linha de contagem — um item por ativo sem garantia lotaria o painel, já
// que essa categoria tende a ter muito mais ativos que manutenção/vencimento.
//
// A contagem é feita direto sobre todos os ativos (mesma fórmula do
// mini-stat "Sem garantia" do Dashboard) em vez de reaproveitar o `reason`
// de getAttentionItems — lá cada ativo só carrega UM motivo (prioriza
// "Em manutenção"), então um ativo em manutenção e sem garantia ficaria de
// fora dessa contagem e o número não bateria com o do Dashboard.
export function useNotifications() {
  const { data: assets } = useAssets()
  return useMemo(() => {
    const list = assets ?? []
    const items = getAttentionItems(list).filter((i) => i.reason !== 'garantia-missing')
    const missingCount = list.filter((a) => assetWarrantyInfo(a).cls === 'missing').length

    const summary = missingCount
      ? [
          {
            id: 'summary-garantia-missing',
            title: `${missingCount} ${missingCount === 1 ? 'dispositivo' : 'dispositivos'} sem garantia`,
            subtitle: 'Cadastre a data de garantia para acompanhar o vencimento.',
            status: null,
          },
        ]
      : []

    return [...items.slice(0, MAX_ITEMS - summary.length), ...summary]
  }, [assets])
}
