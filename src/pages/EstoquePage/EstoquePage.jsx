import { useState } from 'react'
import { useStock } from '../../hooks/data/useStock'
import { useStockMutations } from '../../hooks/data/useStockMutations'
import { useAssets } from '../../hooks/data/useAssets'
import { useEstoqueData } from './useEstoqueData'
import { useCrudPanelState } from '../../hooks/useCrudPanelState'
import Button from '../../components/ui/Button/Button'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import Tabs from '../../components/ui/Tabs/Tabs'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import StockFilters from '../../components/estoque/StockFilters/StockFilters'
import StockTable from '../../components/estoque/StockTable/StockTable'
import StockViewModal from '../../components/estoque/StockViewModal/StockViewModal'
import StockFormModal from '../../components/estoque/StockFormModal/StockFormModal'
import styles from './EstoquePage.module.css'

const DEFAULT_FILTERS = {
  tipo: 'Todos',
  status: '',
  search: '',
}

export default function EstoquePage() {
  const { data: stock, isLoading, isError } = useStock()
  const { data: assets } = useAssets()
  const stockMutations = useStockMutations()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const list = stock ?? []
  const assetList = assets ?? []
  const data = useEstoqueData(list, filters)
  const panel = useCrudPanelState({
    list,
    uidParam: 'stockUid',
    mutations: {
      create: stockMutations.createStock,
      update: stockMutations.updateStock,
      remove: stockMutations.deleteStock,
    },
  })

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleTipoChange(tipo) {
    setFilters((f) => ({ ...f, tipo }))
  }

  function handleClearFilters() {
    updateFilters({ search: '', status: '' })
  }

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Estoque</h2>
          <p>Peças, periféricos e dispositivos disponíveis para reposição ou entrega.</p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={panel.openNew}>
            + Novo item
          </Button>
        </div>
      </div>

      <Tabs items={data.tipoTabs} value={filters.tipo} onChange={handleTipoChange} />

      <StockFilters filters={filters} onChange={updateFilters} onClear={handleClearFilters} />

      {isLoading && (
        <div className={styles.state}>
          <Loading label="Carregando estoque..." />
        </div>
      )}

      {isError && (
        <Alert variant="danger">Não foi possível carregar o estoque. Verifique sua conexão.</Alert>
      )}

      {!isLoading && !isError && (
        <StockTable
          rows={data.rows}
          onView={(i) => panel.openView(i.uid)}
          onEdit={panel.openEdit}
          onDelete={panel.requestDelete}
        />
      )}

      <StockViewModal
        open={!!panel.viewingItem}
        item={panel.viewingItem}
        onClose={panel.closeView}
        onEdit={panel.openEditFromView}
      />

      <StockFormModal
        open={panel.formItem !== undefined}
        item={panel.formItem}
        assets={assetList}
        onClose={panel.closeForm}
        onSave={panel.handleSaveForm}
        onDelete={panel.handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!panel.pendingDelete}
        title="Excluir item do estoque?"
        message={
          panel.pendingDelete
            ? `O item "${panel.pendingDelete.item}" (${panel.pendingDelete.tipo}) será removido permanentemente do estoque.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={panel.handleConfirmDelete}
        onCancel={panel.cancelDelete}
      />
    </div>
  )
}
