import Modal from '../../ui/Modal/Modal'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import { unitDisplayName } from '../../../utils/formatters'
import { stockStatusVariant } from '../../../utils/statusBadge'
import panelStyles from '../StockPanel.module.css'

function ViewRow({ label, value }) {
  return (
    <div className={panelStyles.viewRow}>
      {label && <div className={panelStyles.vrLabel}>{label}</div>}
      <div className={panelStyles.vrValue}>{value || 'Não informado'}</div>
    </div>
  )
}

// Ficha de visualização de um item de estoque (openStockViewModal() do
// sistema original) — somente leitura, uma única coluna (sem cartões/grid
// como em Ativos), com atalho para abrir a edição.
export default function StockViewModal({ open, item, onClose, onEdit }) {
  if (!item) return null

  const meta = [item.marcaModelo, unitDisplayName(item.unidade)].filter(Boolean).join(' · ')

  return (
    <Modal open={open} onClose={onClose} showCloseButton={false} maxWidth="600px">
      <div className={panelStyles.viewHeaderRow}>
        <div>
          <h2 className={panelStyles.viewHeadTitle}>{item.item}</h2>
          <div className={panelStyles.viewHeadSub}>{item.tipo}</div>
          <div className={panelStyles.viewHeadBadge}>
            <Badge variant={stockStatusVariant(item.status)}>{item.status || 'Disponível'}</Badge>
          </div>
          <div className={panelStyles.viewHeadMeta}>{meta || '—'}</div>
        </div>
        <Button variant="primary" size="sm" onClick={onEdit}>
          Editar item
        </Button>
      </div>

      <div className={panelStyles.viewSection}>
        <div className={panelStyles.viewSectionTitle}>Informações do item</div>
        <div className={panelStyles.viewRows}>
          <ViewRow label="Tipo" value={item.tipo} />
          <ViewRow label="Nome do item" value={item.item} />
          <ViewRow label="Marca / Modelo" value={item.marcaModelo} />
          <ViewRow label="Quantidade" value={item.quantidade || '0'} />
          <ViewRow label="Unidade / Local" value={unitDisplayName(item.unidade)} />
          <ViewRow label="Status" value={item.status || 'Disponível'} />
        </div>
      </div>

      {item.observacoes && (
        <div className={panelStyles.viewSection}>
          <div className={panelStyles.viewSectionTitle}>Observações</div>
          <div className={panelStyles.viewRows}>
            <ViewRow value={item.observacoes} />
          </div>
        </div>
      )}
    </Modal>
  )
}
