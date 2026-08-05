import Badge from '../../ui/Badge/Badge'
import EmptyHint from '../EmptyHint/EmptyHint'
import { assetStatusVariant } from '../../../utils/statusBadge'
import styles from './AttentionList.module.css'

// Lista "Requer atenção" (.attn-list): ativos em manutenção ou com garantia
// vencendo/vencida, no máximo 8 (mesmo recorte do sistema original).
export default function AttentionList({ items }) {
  if (!items.length)
    return <EmptyHint>Tudo em ordem — nenhum item requer atenção imediata.</EmptyHint>

  return (
    <div className={styles.list}>
      {items.map((item) => (
        <div key={item.id} className={styles.item}>
          <div className={styles.main}>
            <b>{item.title}</b>
            <span>{item.subtitle}</span>
          </div>
          <Badge variant={assetStatusVariant(item.status)}>{item.status}</Badge>
        </div>
      ))}
    </div>
  )
}
