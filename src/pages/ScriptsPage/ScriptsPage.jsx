import { useState } from 'react'
import { useScripts } from '../../hooks/data/useScripts'
import { useScriptMutations } from '../../hooks/data/useScriptMutations'
import { useScriptsData } from './useScriptsData'
import { useCrudPanelState } from '../../hooks/useCrudPanelState'
import Button from '../../components/ui/Button/Button'
import TableSkeleton from '../../components/ui/TableSkeleton/TableSkeleton'
import Alert from '../../components/ui/Alert/Alert'
import Tabs from '../../components/ui/Tabs/Tabs'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import ScriptFilters from '../../components/scripts/ScriptFilters/ScriptFilters'
import ScriptTable from '../../components/scripts/ScriptTable/ScriptTable'
import ScriptDrawer from '../../components/scripts/ScriptDrawer/ScriptDrawer'
import ScriptFormModal from '../../components/scripts/ScriptFormModal/ScriptFormModal'
import styles from './ScriptsPage.module.css'

const DEFAULT_FILTERS = {
  categoria: 'Todos',
  search: '',
  sort: 'nome',
  onlyFavorites: false,
}

export default function ScriptsPage() {
  const { data: scripts, isLoading, isError } = useScripts()
  const { createScript, updateScript, deleteScript, toggleFavorite, registerDownload } =
    useScriptMutations()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const list = scripts ?? []
  const data = useScriptsData(list, filters)
  const panel = useCrudPanelState({
    list,
    uidParam: 'scriptUid',
    mutations: { create: createScript, update: updateScript, remove: deleteScript },
  })

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleCategoriaChange(categoria) {
    setFilters((f) => ({ ...f, categoria }))
  }

  function handleClearFilters() {
    updateFilters({ search: '', sort: 'nome', onlyFavorites: false })
  }

  function handleDeleteFromDrawer(item) {
    panel.closeView()
    panel.requestDelete(item)
  }

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Central de Scripts</h2>
          <p>
            Biblioteca de scripts utilizados pela equipe de TI para automatizar tarefas e
            manutenções.
          </p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={panel.openNew}>
            + Novo script
          </Button>
        </div>
      </div>

      <Tabs items={data.categoriaTabs} value={filters.categoria} onChange={handleCategoriaChange} />

      <ScriptFilters filters={filters} onChange={updateFilters} onClear={handleClearFilters} />

      {isLoading && <TableSkeleton columns={6} />}

      {isError && (
        <Alert variant="danger">Não foi possível carregar os scripts. Verifique sua conexão.</Alert>
      )}

      {!isLoading && !isError && (
        <ScriptTable
          rows={data.rows}
          onView={(s) => panel.openView(s.uid)}
          onEdit={panel.openEdit}
          onDelete={panel.requestDelete}
          onToggleFavorite={(uid) => toggleFavorite.mutate(uid)}
          onDownload={(uid) => registerDownload.mutate(uid)}
        />
      )}

      <ScriptDrawer
        open={!!panel.viewingItem}
        item={panel.viewingItem}
        onClose={panel.closeView}
        onEdit={panel.openEditFromView}
        onDelete={() => handleDeleteFromDrawer(panel.viewingItem)}
        onToggleFavorite={(uid) => toggleFavorite.mutate(uid)}
      />

      <ScriptFormModal
        open={panel.formItem !== undefined}
        item={panel.formItem}
        onClose={panel.closeForm}
        onSave={panel.handleSaveForm}
        onDelete={panel.handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!panel.pendingDelete}
        title="Excluir script?"
        message={
          panel.pendingDelete
            ? `O script "${panel.pendingDelete.nome}" será removido permanentemente da central.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={panel.handleConfirmDelete}
        onCancel={panel.cancelDelete}
      />
    </div>
  )
}
