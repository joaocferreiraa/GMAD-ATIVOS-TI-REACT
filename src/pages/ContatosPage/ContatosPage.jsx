import { useState } from 'react'
import { useContatos } from '../../hooks/data/useContatos'
import { useContatoMutations } from '../../hooks/data/useContatoMutations'
import { useAssets } from '../../hooks/data/useAssets'
import { useContatosData } from './useContatosData'
import { useCrudPanelState } from '../../hooks/useCrudPanelState'
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
  const contatoMutations = useContatoMutations()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const list = contatos ?? []
  const assetList = assets ?? []
  const data = useContatosData(list, assetList, filters)
  const panel = useCrudPanelState({
    list,
    uidParam: 'contatoUid',
    mutations: {
      create: contatoMutations.createContato,
      update: contatoMutations.updateContato,
      remove: contatoMutations.deleteContato,
    },
  })

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

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Contatos</h2>
          <p>Central de contatos corporativos da empresa.</p>
        </div>
        <div className={styles.actionsRow}>
          <Button variant="primary" onClick={panel.openNew}>
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
          onView={(c) => panel.openView(c.uid)}
          onEdit={panel.openEdit}
          onDelete={panel.requestDelete}
        />
      )}

      <ContatoViewModal
        open={!!panel.viewingItem}
        contato={panel.viewingItem}
        contatos={list}
        assets={assetList}
        onClose={panel.closeView}
        onEdit={panel.openEditFromView}
      />

      <ContatoFormModal
        open={panel.formItem !== undefined}
        contato={panel.formItem}
        contatos={list}
        assets={assetList}
        onClose={panel.closeForm}
        onSave={panel.handleSaveForm}
        onDelete={panel.handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!panel.pendingDelete}
        title="Excluir colaborador?"
        message={
          panel.pendingDelete
            ? `O colaborador "${panel.pendingDelete.nome}" será removido permanentemente.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={panel.handleConfirmDelete}
        onCancel={panel.cancelDelete}
      />
    </div>
  )
}
