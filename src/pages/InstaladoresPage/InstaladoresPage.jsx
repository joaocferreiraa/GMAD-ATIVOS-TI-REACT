import { useState } from 'react'
import { useInstaladores } from '../../hooks/data/useInstaladores'
import { useInstaladoresMutations } from '../../hooks/data/useInstaladoresMutations'
import { useInstaladoresData } from './useInstaladoresData'
import Button from '../../components/ui/Button/Button'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import Tabs from '../../components/ui/Tabs/Tabs'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import InstallerFilters from '../../components/instaladores/InstallerFilters/InstallerFilters'
import InstallerTable from '../../components/instaladores/InstallerTable/InstallerTable'
import InstallerDrawer from '../../components/instaladores/InstallerDrawer/InstallerDrawer'
import InstallerFormModal from '../../components/instaladores/InstallerFormModal/InstallerFormModal'
import styles from './InstaladoresPage.module.css'

const DEFAULT_FILTERS = {
  categoria: 'Todos',
  search: '',
  sort: 'nome',
}

export default function InstaladoresPage() {
  const { data: installers, isLoading, isError } = useInstaladores()
  const { createInstalador, updateInstalador, deleteInstalador } = useInstaladoresMutations()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [viewingUid, setViewingUid] = useState(null)
  const [formItem, setFormItem] = useState(undefined) // undefined = fechado, null = novo, objeto = editando
  const [returnToViewUid, setReturnToViewUid] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const list = installers ?? []
  const data = useInstaladoresData(list, filters)

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleCategoriaChange(categoria) {
    setFilters((f) => ({ ...f, categoria }))
  }

  function handleClearFilters() {
    updateFilters({ search: '', sort: 'nome' })
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
      updateInstalador.mutate(
        { instaladorUid: formItem.uid, record },
        {
          onSuccess: () => {
            setReturnToViewUid(null)
            setFormItem(undefined)
            if (ret) setViewingUid(ret)
          },
        },
      )
    } else {
      createInstalador.mutate(record, {
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
    deleteInstalador.mutate(pendingDelete, { onSuccess: () => setPendingDelete(null) })
  }

  const viewingItem = viewingUid ? list.find((i) => i.uid === viewingUid) : null

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Central de Instaladores</h2>
          <p>Programas homologados utilizados pela equipe de TI.</p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={() => setFormItem(null)}>
            + Novo instalador
          </Button>
        </div>
      </div>

      <Tabs items={data.categoriaTabs} value={filters.categoria} onChange={handleCategoriaChange} />

      <InstallerFilters filters={filters} onChange={updateFilters} onClear={handleClearFilters} />

      {isLoading && (
        <div className={styles.state}>
          <Loading label="Carregando instaladores..." />
        </div>
      )}

      {isError && (
        <Alert variant="danger">
          Não foi possível carregar os instaladores. Verifique sua conexão.
        </Alert>
      )}

      {!isLoading && !isError && (
        <InstallerTable
          rows={data.rows}
          onView={(i) => setViewingUid(i.uid)}
          onEdit={(i) => {
            setReturnToViewUid(null)
            setFormItem(i)
          }}
          onDelete={(i) => setPendingDelete(i)}
        />
      )}

      <InstallerDrawer
        open={!!viewingItem}
        item={viewingItem}
        onClose={() => setViewingUid(null)}
        onEdit={() => {
          setReturnToViewUid(viewingUid)
          setViewingUid(null)
          setFormItem(viewingItem)
        }}
      />

      <InstallerFormModal
        open={formItem !== undefined}
        item={formItem}
        onClose={closeForm}
        onSave={handleSaveForm}
        onDelete={handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir instalador?"
        message={
          pendingDelete
            ? `O instalador "${pendingDelete.nome}" será removido permanentemente da central.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
