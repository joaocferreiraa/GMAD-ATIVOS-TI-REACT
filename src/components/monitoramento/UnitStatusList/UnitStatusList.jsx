import Badge from '../../ui/Badge/Badge'
import { unitDisplayName } from '../../../utils/formatters'
import { STATUS_LABEL, statusBadgeVariant } from '../../../utils/networkStatus'
import styles from './UnitStatusList.module.css'

// Situação por unidade (pior status entre os pontos daquela unidade) — ver
// seção 17 do pedido. Clicar filtra a tabela de pontos por aquela unidade.
export default function UnitStatusList({ units, selected, onSelect }) {
  if (!units.length) return null

  return (
    <div className={styles.list}>
      {units.map((u) => (
        <button
          key={u.unidade}
          type="button"
          className={`${styles.item} ${selected === u.unidade ? styles.active : ''}`}
          onClick={() => onSelect(selected === u.unidade ? 'Todas' : u.unidade)}
        >
          <span className={styles.nome}>{unitDisplayName(u.unidade)}</span>
          <Badge variant={statusBadgeVariant(u.status)}>{STATUS_LABEL[u.status]}</Badge>
        </button>
      ))}
    </div>
  )
}
