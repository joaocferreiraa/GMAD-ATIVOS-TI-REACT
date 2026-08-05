import { useState } from 'react'
import { useContatos } from '../../hooks/data/useContatos'
import { useContatoMutations } from '../../hooks/data/useContatoMutations'
import { useAssets } from '../../hooks/data/useAssets'
import { useContatosData } from './useContatosData'
import Button from '../../components/ui/Button/Button'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import ContatoFilters from '../../components/contatos/ContatoFilters/ContatoFilters'
import ContatoTable from '../../components/contatos/ContatoTable/ContatoTable'
import ContatoViewModal from '../../components/contatos/ContatoViewModal/ContatoViewModal'
import ContatoFormModal from '../../components/contatos/ContatoFormModal/ContatoFormModal'
import styles from './ContatosPage.module.css'

const DEFAULT_FILTERS = {
  unidade: '',
  departamento: '',
  gestor: '',
  possuiCelular: '',
  possuiTelefone: '',
  search: '',
  sortKey: 'nome',
  sortDir: 1,
}

export default function ContatosPage() {
  const { data: contatos, isLoading, isError } = useContatos()
  const { data: assets } = useAssets()
  const { createContato, updateContato, deleteContato } = useContatoMutations()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [viewingUid, setViewingUid] = useState(null)
  const [formContato, setFormContato] = useState(undefined) // undefined = fechado, null = novo, objeto = editando
  const [returnToViewUid, setReturnToViewUid] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  const list = contatos ?? []
  const assetList = assets ?? []
  const data = useContatosData(list, assetList, filters)

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleSort(key) {
    setFilters((f) => ({ ...f, sortKey: key, sortDir: f.sortKey === key ? f.sortDir * -1 : 1 }))
  }

  function handleClearFilters() {
    updateFilters({
      unidade: '',
      departamento: '',
      gestor: '',
      possuiCelular: '',
      possuiTelefone: '',
      search: '',
    })
  }

  function closeForm() {
    const ret = returnToViewUid
    setReturnToViewUid(null)
    setFormContato(undefined)
    if (ret) setViewingUid(ret)
  }

  function handleSaveForm(record, isEdit) {
    const ret = isEdit ? returnToViewUid : null
    if (isEdit) {
      updateContato.mutate(
        { contatoUid: formContato.uid, record },
        {
          onSuccess: () => {
            setReturnToViewUid(null)
            setFormContato(undefined)
            if (ret) setViewingUid(ret)
          },
        },
      )
    } else {
      createContato.mutate(record, {
        onSuccess: () => {
          setFormContato(undefined)
        },
      })
    }
  }

  function handleDeleteFromForm(contato) {
    setReturnToViewUid(null)
    setFormContato(undefined)
    setPendingDelete(contato)
  }

  function handleConfirmDelete() {
    deleteContato.mutate(pendingDelete, { onSuccess: () => setPendingDelete(null) })
  }

  const viewingContato = viewingUid ? list.find((c) => c.uid === viewingUid) : null

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Contatos</h2>
          <p>Central de contatos corporativos da empresa.</p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={() => setFormContato(null)}>
            + Novo colaborador
          </Button>
        </div>
      </div>

      <ContatoFilters
        filters={filters}
        unidades={data.unidades}
        departamentos={data.departamentos}
        onChange={updateFilters}
        onClear={handleClearFilters}
      />

      {isLoading && (
        <div className={styles.state}>
          <Loading label="Carregando contatos..." />
        </div>
      )}

      {isError && (
        <Alert variant="danger">
          Não foi possível carregar os contatos. Verifique sua conexão.
        </Alert>
      )}

      {!isLoading && !isError && (
        <ContatoTable
          rows={data.rows}
          gestorMap={data.gestorMap}
          assets={assetList}
          sortKey={filters.sortKey}
          sortDir={filters.sortDir}
          onSort={handleSort}
          onView={(c) => setViewingUid(c.uid)}
          onEdit={(c) => {
            setReturnToViewUid(null)
            setFormContato(c)
          }}
          onDelete={(c) => setPendingDelete(c)}
        />
      )}

      <ContatoViewModal
        open={!!viewingContato}
        contato={viewingContato}
        contatos={list}
        assets={assetList}
        onClose={() => setViewingUid(null)}
        onEdit={() => {
          setReturnToViewUid(viewingUid)
          setViewingUid(null)
          setFormContato(viewingContato)
        }}
      />

      <ContatoFormModal
        open={formContato !== undefined}
        contato={formContato}
        contatos={list}
        assets={assetList}
        onClose={closeForm}
        onSave={handleSaveForm}
        onDelete={handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir colaborador?"
        message={
          pendingDelete
            ? `O colaborador "${pendingDelete.nome}" será removido permanentemente.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={handleConfirmDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  )
}
