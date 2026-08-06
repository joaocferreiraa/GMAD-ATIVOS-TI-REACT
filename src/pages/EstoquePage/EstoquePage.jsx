import { useState } from 'react'
import { useStock } from '../../hooks/data/useStock'
import { useStockMutations } from '../../hooks/data/useStockMutations'
import { useAssets } from '../../hooks/data/useAssets'
import { useEstoqueData } from './useEstoqueData'
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
  const { createStock, updateStock, deleteStock } = useStockMutations()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [viewingUid, setViewingUid] = useState(null)
  const [formItem, setFormItem] = useState(undefined) // undefined = fechado, null = novo, objeto = editando
  const [returnToViewUid, setReturnToViewUid] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const list = stock ?? []
  const assetList = assets ?? []
  const data = useEstoqueData(list, filters)

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleTipoChange(tipo) {
    setFilters((f) => ({ ...f, tipo }))
  }

  function handleClearFilters() {
    updateFilters({ search: '', status: '' })
  }

  function closeForm() {
    const ret = returnToViewUid
    setReturnToViewUid(null)
    setFormItem(undefined)
    if (ret) setViewingUid(ret)
  }

  function handleSaveForm(record, isEdit) {
    const ret = isEdit ? returnToViewUid : null
    if (isEdit) {
      updateStock.mutate(
        { stockUid: formItem.uid, record },
        {
          onSuccess: () => {
            setReturnToViewUid(null)
            setFormItem(undefined)
            if (ret) setViewingUid(ret)
          },
        },
      )
    } else {
      createStock.mutate(record, {
        onSuccess: () => {
          setFormItem(undefined)
        },
      })
    }
  }

  function handleDeleteFromForm(item) {
    setReturnToViewUid(null)
    setFormItem(undefined)
    setPendingDelete(item)
  }

  function handleConfirmDelete() {
    deleteStock.mutate(pendingDelete, { onSuccess: () => setPendingDelete(null) })
  }

  const viewingItem = viewingUid ? list.find((i) => i.uid === viewingUid) : null

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Estoque</h2>
          <p>Peças, periféricos e dispositivos disponíveis para reposição ou entrega.</p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={() => setFormItem(null)}>
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
          onView={(i) => setViewingUid(i.uid)}
          onEdit={(i) => {
            setReturnToViewUid(null)
            setFormItem(i)
          }}
          onDelete={(i) => setPendingDelete(i)}
        />
      )}

      <StockViewModal
        open={!!viewingItem}
        item={viewingItem}
        onClose={() => setViewingUid(null)}
        onEdit={() => {
          setReturnToViewUid(viewingUid)
          setViewingUid(null)
          setFormItem(viewingItem)
        }}
      />

      <StockFormModal
        open={formItem !== undefined}
        item={formItem}
        assets={assetList}
        onClose={closeForm}
        onSave={handleSaveForm}
        onDelete={handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir item do estoque?"
        message={
          pendingDelete
            ? `O item "${pendingDelete.item}" (${pendingDelete.tipo}) será removido permanentemente do estoque.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
