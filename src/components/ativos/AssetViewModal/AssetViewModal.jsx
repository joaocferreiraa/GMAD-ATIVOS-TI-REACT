import Modal from '../../ui/Modal/Modal'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import { FIELD_GROUPS } from '../../../constants/fieldGroups'
import { CAT_ICON } from '../../../constants/categories'
import { StockIcon } from '../../ui/Icon/icons'
import { fmtDate, fmtMoney, unitDisplayName, warrantyInfo } from '../../../utils/formatters'
import { assetStatusVariant, warrantyVariant } from '../../../utils/statusBadge'
import panelStyles from '../AssetPanel.module.css'

function ViewRow({ label, value, raw }) {
  return (
    <div className={panelStyles.viewRow}>
      <div className={panelStyles.vrLabel}>{label}</div>
      <div className={panelStyles.vrValue}>{raw ? value : value || 'Não informado'}</div>
    </div>
  )
}

// Ficha de visualização de um ativo (.view-panel do sistema original) —
// somente leitura, com atalho para abrir a edição.
export default function AssetViewModal({ open, asset, onClose, onEdit }) {
  if (!asset) return null

  const groups = (FIELD_GROUPS[asset.categoria] || []).filter((g) => g.key !== 'nf')
  const techRows = groups.filter((g) => asset[g.key])
  const warranty = warrantyInfo(asset.garantiaAte)
  const Icon = CAT_ICON[asset.categoria] || StockIcon
  const metaParts = [asset.departamento, unitDisplayName(asset.unidade)].filter(Boolean)

  return (
    <Modal open={open} onClose={onClose} maxWidth="min(94vw, 1040px)">
      <div className={panelStyles.viewHeader}>
        <div className={panelStyles.viewHeaderRow}>
          <div className={panelStyles.viewHeadRow}>
            <div className={panelStyles.viewHeadIcon}>
              <Icon />
            </div>
            <div>
              <h2 className={panelStyles.viewHeadTitle}>
                {[asset.categoria, asset.modelo].filter(Boolean).join(' ')}
              </h2>
              <div className={panelStyles.viewHeadSub}>{asset.id}</div>
              <div className={panelStyles.viewHeadBadge}>
                <Badge variant={assetStatusVariant(asset.status)}>{asset.status || 'Ativo'}</Badge>
              </div>
            </div>
          </div>
          <Button variant="primary" size="sm" onClick={onEdit}>
            Editar ativo
          </Button>
        </div>
        <div className={panelStyles.viewMetaRow}>
          {asset.usuario && (
            <span>
              <b>{asset.usuario}</b>
            </span>
          )}
          {metaParts.map((p) => (
            <span key={p}>{p}</span>
          ))}
        </div>
      </div>

      <div className={panelStyles.viewGrid}>
        <div className={panelStyles.viewCol}>
          <div className={panelStyles.viewCard}>
            <div className={panelStyles.viewSectionTitle}>Informações gerais</div>
            <div className={panelStyles.viewRows}>
              <ViewRow label="Categoria" value={asset.categoria} />
              <ViewRow label="ID do ativo" value={asset.id} />
              <ViewRow
                label="Etiqueta física"
                value={asset.etiqueta === 'Possui' ? 'Possui' : 'Não possui'}
              />
              {techRows.map((g) => (
                <ViewRow key={g.key} label={g.label} value={asset[g.key]} />
              ))}
            </div>
            {!techRows.length && (
              <div className={panelStyles.viewEmpty}>
                Nenhuma característica técnica cadastrada.
              </div>
            )}
          </div>
        </div>
        <div className={panelStyles.viewCol}>
          <div className={panelStyles.viewCard}>
            <div className={panelStyles.viewSectionTitle}>Localização</div>
            <div className={panelStyles.viewRows}>
              <ViewRow label="Unidade / Local" value={unitDisplayName(asset.unidade)} />
              <ViewRow label="Departamento" value={asset.departamento} />
              <ViewRow label="Usuário" value={asset.usuario} />
            </div>
          </div>
          <div className={panelStyles.viewCard}>
            <div className={panelStyles.viewSectionTitle}>Informações complementares</div>
            <div className={panelStyles.viewRows}>
              <ViewRow label="Data de aquisição" value={fmtDate(asset.dataAquisicao)} />
              <ViewRow
                label="Garantia"
                raw
                value={<Badge variant={warrantyVariant(warranty.cls)}>{warranty.label}</Badge>}
              />
              <ViewRow label="Preço de compra" value={fmtMoney(asset.preco)} />
              {asset.nf && <ViewRow label="Nota fiscal" value={asset.nf} />}
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
