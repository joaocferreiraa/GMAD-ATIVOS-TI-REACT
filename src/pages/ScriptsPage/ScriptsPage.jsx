import { useState } from 'react'
import { useScripts } from '../../hooks/data/useScripts'
import { useScriptMutations } from '../../hooks/data/useScriptMutations'
import { useScriptsData } from './useScriptsData'
import Button from '../../components/ui/Button/Button'
import Loading from '../../components/ui/Loading/Loading'
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
  const [viewingUid, setViewingUid] = useState(null)
  const [formItem, setFormItem] = useState(undefined) // undefined = fechado, null = novo, objeto = editando
  const [returnToViewUid, setReturnToViewUid] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const list = scripts ?? []
  const data = useScriptsData(list, filters)

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleCategoriaChange(categoria) {
    setFilters((f) => ({ ...f, categoria }))
  }

  function handleClearFilters() {
    updateFilters({ search: '', sort: 'nome', onlyFavorites: false })
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
      updateScript.mutate(
        { scriptUid: formItem.uid, record },
        {
          onSuccess: () => {
            setReturnToViewUid(null)
            setFormItem(undefined)
            if (ret) setViewingUid(ret)
          },
        },
      )
    } else {
      createScript.mutate(record, {
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

  function handleDeleteFromDrawer(item) {
    setViewingUid(null)
    setPendingDelete(item)
  }

  function handleConfirmDelete() {
    deleteScript.mutate(pendingDelete, { onSuccess: () => setPendingDelete(null) })
  }

  const viewingItem = viewingUid ? list.find((s) => s.uid === viewingUid) : null

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
          <Button variant="primary" onClick={() => setFormItem(null)}>
            + Novo script
          </Button>
        </div>
      </div>

      <Tabs items={data.categoriaTabs} value={filters.categoria} onChange={handleCategoriaChange} />

      <ScriptFilters filters={filters} onChange={updateFilters} onClear={handleClearFilters} />

      {isLoading && (
        <div className={styles.state}>
          <Loading label="Carregando scripts..." />
        </div>
      )}

      {isError && (
        <Alert variant="danger">Não foi possível carregar os scripts. Verifique sua conexão.</Alert>
      )}

      {!isLoading && !isError && (
        <ScriptTable
          rows={data.rows}
          onView={(s) => setViewingUid(s.uid)}
          onEdit={(s) => {
            setReturnToViewUid(null)
            setFormItem(s)
          }}
          onDelete={(s) => setPendingDelete(s)}
          onToggleFavorite={(uid) => toggleFavorite.mutate(uid)}
          onDownload={(uid) => registerDownload.mutate(uid)}
        />
      )}

      <ScriptDrawer
        open={!!viewingItem}
        item={viewingItem}
        onClose={() => setViewingUid(null)}
        onEdit={() => {
          setReturnToViewUid(viewingUid)
          setViewingUid(null)
          setFormItem(viewingItem)
        }}
        onDelete={() => handleDeleteFromDrawer(viewingItem)}
        onToggleFavorite={(uid) => toggleFavorite.mutate(uid)}
        onDownload={(uid) => registerDownload.mutate(uid)}
      />

      <ScriptFormModal
        open={formItem !== undefined}
        item={formItem}
        onClose={closeForm}
        onSave={handleSaveForm}
        onDelete={handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir script?"
        message={
          pendingDelete
            ? `O script "${pendingDelete.nome}" será removido permanentemente da central.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
