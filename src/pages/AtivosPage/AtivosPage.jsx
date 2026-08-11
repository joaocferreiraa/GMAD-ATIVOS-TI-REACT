import { useState } from 'react'
import { useAssets } from '../../hooks/data/useAssets'
import { useAssetMutations } from '../../hooks/data/useAssetMutations'
import { useAtivosData } from './useAtivosData'
import { useToast } from '../../hooks/useToast'
import { useCrudPanelState } from '../../hooks/useCrudPanelState'
import { exportAssetsCsv } from '../../services/ativos/assetsService'
import { MADVILLE_GROUP, getDepartamentos, matchesUnitValue } from '../../utils/units'
import { getUsuarios } from '../../utils/assetsFilter'
import Button from '../../components/ui/Button/Button'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import Tabs, { Tab, TabGroupLabel } from '../../components/ui/Tabs/Tabs'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import { RefreshIcon, DownloadIcon } from '../../components/ui/Icon/icons'
import AssetFilters from '../../components/ativos/AssetFilters/AssetFilters'
import AssetTable from '../../components/ativos/AssetTable/AssetTable'
import AssetViewModal from '../../components/ativos/AssetViewModal/AssetViewModal'
import AssetFormModal from '../../components/ativos/AssetFormModal/AssetFormModal'
import styles from './AtivosPage.module.css'

const DEFAULT_FILTERS = {
  unidade: 'Todas',
  categoria: 'Todos',
  search: '',
  status: '',
  dept: '',
  etiqueta: '',
  garantia: '',
  usuario: '',
  sortKey: null,
  sortDir: 1,
}

// Reaplica dept/usuario só se ainda fizerem sentido no novo escopo de
// unidade/categoria (mesmo ajuste do renderDeptFilter/renderUsuarioFilter
// originais — usado ao trocar de categoria), calculado no próprio evento
// que muda o escopo — não depois, em efeito. Ao trocar de UNIDADE, o
// original zera "dept" incondicionalmente (handler de #unitTabs, antes de
// renderDeptFilter rodar) — ver handleUnitChange, que só reaproveita a
// parte de "usuario" desta função.
function clampDeptUsuario(assets, unidade, categoria, dept, usuario) {
  const scopedByUnit =
    unidade === 'Todas' ? assets : assets.filter((a) => matchesUnitValue(a.unidade, unidade))
  const scoped =
    categoria === 'Todos' ? scopedByUnit : scopedByUnit.filter((a) => a.categoria === categoria)
  const depts = getDepartamentos(scoped)
  const usuarios = getUsuarios(scoped)
  return {
    dept: depts.includes(dept) ? dept : '',
    usuario: usuarios.includes(usuario) ? usuario : '',
  }
}

export default function AtivosPage() {
  const { data: assets, isLoading, isError, refetch } = useAssets()
  const assetMutations = useAssetMutations()
  const { showToast } = useToast()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const list = assets ?? []
  const data = useAtivosData(list, filters)
  const panel = useCrudPanelState({
    list,
    uidParam: 'assetUid',
    mutations: {
      create: assetMutations.createAsset,
      update: assetMutations.updateAsset,
      remove: assetMutations.deleteAsset,
    },
  })

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleUnitChange(unidade) {
    setFilters((f) => ({
      ...f,
      unidade,
      dept: '',
      usuario: clampDeptUsuario(list, unidade, f.categoria, f.dept, f.usuario).usuario,
    }))
  }

  function handleCategoriaChange(categoria) {
    setFilters((f) => ({
      ...f,
      categoria,
      sortKey: null,
      ...clampDeptUsuario(list, f.unidade, categoria, f.dept, f.usuario),
    }))
  }

  function handleSort(key) {
    setFilters((f) => ({ ...f, sortKey: key, sortDir: f.sortKey === key ? f.sortDir * -1 : 1 }))
  }

  function handleClearFilters() {
    updateFilters({ search: '', status: '', dept: '', etiqueta: '', garantia: '', usuario: '' })
  }

  async function handleRefresh() {
    await refetch()
    showToast('Dados atualizados.')
  }

  function handleExport() {
    if (!data.rows.length) {
      showToast('Nada para exportar com os filtros atuais.', 'danger')
      return
    }
    exportAssetsCsv(data.rows)
    showToast(`CSV exportado (${data.rows.length} ativos).`)
  }

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Ativos cadastrados</h2>
          <p>Gerencie, filtre e edite os equipamentos de TI da empresa.</p>
        </div>
        <div className={styles.actionsRow}>
          <Button size="sm" title="Buscar atualizações da equipe" onClick={handleRefresh}>
            <RefreshIcon /> Atualizar
          </Button>
          <Button size="sm" onClick={handleExport}>
            <DownloadIcon /> Exportar CSV
          </Button>
          <Button variant="primary" onClick={panel.openNew}>
            + Novo ativo
          </Button>
        </div>
      </div>

      <Tabs value={filters.unidade} onChange={handleUnitChange}>
        <Tab
          active={filters.unidade === 'Todas'}
          count={data.unitTabs.todosCount}
          onClick={() => handleUnitChange('Todas')}
        >
          Todos
        </Tab>
        <Tab
          active={filters.unidade === MADVILLE_GROUP}
          count={data.unitTabs.madvilleGroupCount}
          onClick={() => handleUnitChange(MADVILLE_GROUP)}
        >
          Todos os dispositivos GMAD Madville
        </Tab>
        {data.unitTabs.madvilleUnits.length > 0 && (
          <>
            <TabGroupLabel>GMAD Madville</TabGroupLabel>
            {data.unitTabs.madvilleUnits.map((u) => (
              <Tab
                key={u.value}
                active={filters.unidade === u.value}
                count={u.count}
                onClick={() => handleUnitChange(u.value)}
              >
                {u.label}
              </Tab>
            ))}
          </>
        )}
        {data.unitTabs.outrasUnits.length > 0 && (
          <>
            <TabGroupLabel>Outras lojas atendidas pelo TI/Madville</TabGroupLabel>
            {data.unitTabs.outrasUnits.map((u) => (
              <Tab
                key={u.value}
                active={filters.unidade === u.value}
                count={u.count}
                onClick={() => handleUnitChange(u.value)}
              >
                {u.label}
              </Tab>
            ))}
          </>
        )}
      </Tabs>

      <Tabs items={data.categoryTabs} value={filters.categoria} onChange={handleCategoriaChange} />

      <AssetFilters
        filters={filters}
        departamentos={data.departamentos}
        usuarios={data.usuarios}
        onChange={updateFilters}
        onClear={handleClearFilters}
      />

      {isLoading && (
        <div className={styles.state}>
          <Loading label="Carregando ativos..." />
        </div>
      )}

      {isError && (
        <Alert variant="danger">Não foi possível carregar os ativos. Verifique sua conexão.</Alert>
      )}

      {!isLoading && !isError && (
        <AssetTable
          categoria={filters.categoria}
          rows={data.rows}
          sortKey={filters.sortKey}
          sortDir={filters.sortDir}
          onSort={handleSort}
          onView={(a) => panel.openView(a.uid)}
          onEdit={panel.openEdit}
          onDelete={panel.requestDelete}
        />
      )}

      <AssetViewModal
        open={!!panel.viewingItem}
        asset={panel.viewingItem}
        onClose={panel.closeView}
        onEdit={panel.openEditFromView}
      />

      <AssetFormModal
        open={panel.formItem !== undefined}
        asset={panel.formItem}
        assets={list}
        defaultUnidade={
          filters.unidade !== 'Todas' && filters.unidade !== MADVILLE_GROUP ? filters.unidade : ''
        }
        onClose={panel.closeForm}
        onSave={panel.handleSaveForm}
        onDelete={panel.handleDeleteFromForm}
      />

      <ConfirmDialog
        open={!!panel.pendingDelete}
        title="Excluir ativo?"
        message={
          panel.pendingDelete
            ? `O ativo "${panel.pendingDelete.id}" (${panel.pendingDelete.categoria}) será removido permanentemente do controle.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={panel.handleConfirmDelete}
        onCancel={panel.cancelDelete}
      />
    </div>
  )
}
