import { useState } from 'react'
import { useInstaladores } from '../../hooks/data/useInstaladores'
import { useInstaladoresMutations } from '../../hooks/data/useInstaladoresMutations'
import { useInstaladoresData } from './useInstaladoresData'
import { useCrudPanelState } from '../../hooks/useCrudPanelState'
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
  const instaladoresMutations = useInstaladoresMutations()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const list = installers ?? []
  const data = useInstaladoresData(list, filters)
  const panel = useCrudPanelState({
    list,
    uidParam: 'instaladorUid',
    mutations: {
      create: instaladoresMutations.createInstalador,
      update: instaladoresMutations.updateInstalador,
      remove: instaladoresMutations.deleteInstalador,
    },
  })

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleCategoriaChange(categoria) {
    setFilters((f) => ({ ...f, categoria }))
  }

  function handleClearFilters() {
    updateFilters({ search: '', sort: 'nome' })
  }

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Central de Instaladores</h2>
          <p>Programas homologados utilizados pela equipe de TI.</p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={panel.openNew}>
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
          onView={(i) => panel.openView(i.uid)}
          onEdit={panel.openEdit}
          onDelete={panel.requestDelete}
        />
      )}

      <InstallerDrawer
        open={!!panel.viewingItem}
        item={panel.viewingItem}
        onClose={panel.closeView}
        onEdit={panel.openEditFromView}
      />

      <InstallerFormModal
        open={panel.formItem !== undefined}
        item={panel.formItem}
        onClose={panel.closeForm}
        onSave={panel.handleSaveForm}
        onDelete={panel.handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!panel.pendingDelete}
        title="Excluir instalador?"
        message={
          panel.pendingDelete
            ? `O instalador "${panel.pendingDelete.nome}" será removido permanentemente da central.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={panel.handleConfirmDelete}
        onCancel={panel.cancelDelete}
      />
    </div>
  )
}
