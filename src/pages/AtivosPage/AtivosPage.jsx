import { useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAssets } from '../../hooks/data/useAssets'
import { useAssetMutations } from '../../hooks/data/useAssetMutations'
import { useContatos } from '../../hooks/data/useContatos'
import { useAtivosData } from './useAtivosData'
import { useInventario } from '../../hooks/data/useInventario'
import { useToast } from '../../hooks/useToast'
import { useCrudPanelState } from '../../hooks/useCrudPanelState'
import { useHoverTooltip } from '../../hooks/overlay/useHoverTooltip'
import { exportAssetsCsv } from '../../services/ativos/assetsService'
import { ROUTES } from '../../constants/routes'
import { MADVILLE_GROUP, getDepartamentos, matchesUnitValue } from '../../utils/units'
import { getUsuarios } from '../../utils/assetsFilter'
import {
  indexarInventario,
  maquinaDoAtivo,
  maquinasSemCadastro,
  camposDetectados,
} from '../../utils/inventarioMatch'
import Button from '../../components/ui/Button/Button'
import TableSkeleton from '../../components/ui/TableSkeleton/TableSkeleton'
import Alert from '../../components/ui/Alert/Alert'
import Tabs, { Tab, TabGroupLabel } from '../../components/ui/Tabs/Tabs'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import { RefreshIcon, DownloadIcon, MonitorIcon } from '../../components/ui/Icon/icons'
import AssetFilters from '../../components/ativos/AssetFilters/AssetFilters'
import AssetTable from '../../components/ativos/AssetTable/AssetTable'
import AssetViewModal from '../../components/ativos/AssetViewModal/AssetViewModal'
import AssetFormModal from '../../components/ativos/AssetFormModal/AssetFormModal'
import MaquinasSemCadastro from '../../components/ativos/MaquinasSemCadastro/MaquinasSemCadastro'
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
  const { data: contatos } = useContatos()
  // Inventário do agente: a metade técnica das fichas. Falha aqui (tabela
  // ainda não criada, agente nunca instalado) não pode derrubar a tela de
  // Ativos, que funcionava sozinha antes disso existir — por isso só o
  // `data` é consumido, sem isError.
  const { data: inventario } = useInventario()
  const assetMutations = useAssetMutations()
  const { showToast } = useToast()
  const location = useLocation()
  const bindTooltip = useHoverTooltip()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  // `list` e `inventarioList` em useMemo (e não `assets ?? []` solto): o
  // literal `[]` do fallback é um array NOVO a cada render, o que
  // invalidaria os useMemo abaixo em todo teclar de filtro.
  const list = useMemo(() => assets ?? [], [assets])
  const contatosList = contatos ?? []
  const inventarioList = useMemo(() => inventario ?? [], [inventario])
  const data = useAtivosData(list, filters)

  // Índice por hostname/serial, recalculado só quando o inventário muda —
  // não a cada tecla digitada num filtro.
  const indiceInventario = useMemo(() => indexarInventario(inventarioList), [inventarioList])
  const semCadastro = useMemo(
    () => maquinasSemCadastro(inventarioList, list),
    [inventarioList, list],
  )
  const panel = useCrudPanelState({
    list,
    uidParam: 'assetUid',
    mutations: {
      create: assetMutations.createAsset,
      update: assetMutations.updateAsset,
      remove: assetMutations.deleteAsset,
    },
  })

  // Abre a ficha de um ativo específico ao chegar via busca da Topbar
  // (CommandPalette navega com location.state.openUid). Comparação com o
  // valor já tratado durante o render, em vez de useEffect+setState.
  const requestedUid = location.state?.openUid
  const [handledUid, setHandledUid] = useState(null)
  if (requestedUid && requestedUid !== handledUid && list.some((a) => a.uid === requestedUid)) {
    setHandledUid(requestedUid)
    panel.openView(requestedUid)
  }

  // Aplica um recorte de filtros ao chegar via sino de notificações ou via
  // os cards do Dashboard (location.state.filters). Dedup por
  // `location.key` (único por navegação, mesmo pra cliques repetidos no
  // mesmo item) em vez do objeto `filters` em si — esse objeto vem de um
  // useMemo (useNotifications/useDashboardData) e mantém a mesma
  // referência entre renders, então comparar por referência deixava de
  // reaplicar num segundo clique na mesma notificação. Reseta pros
  // DEFAULT_FILTERS antes de aplicar o recorte novo: como a Topbar nunca
  // desmonta entre rotas, ficar só sobrepondo (`{...f, ...requestedFilters}`)
  // deixava filtros antigos (dept/usuario/status/...) ativos por baixo,
  // estreitando o resultado silenciosamente.
  const requestedFilters = location.state?.filters
  const [handledFiltersKey, setHandledFiltersKey] = useState(null)
  if (requestedFilters && location.key !== handledFiltersKey) {
    setHandledFiltersKey(location.key)
    setFilters({ ...DEFAULT_FILTERS, ...requestedFilters })
  }

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

  // Cadastra uma máquina detectada: abre o formulário de novo ativo já
  // preenchido com o que o agente sabe, e com o ID sugerido igual ao
  // hostname — que é como as máquinas deste parque são nomeadas, e o que
  // faz o casamento funcionar na próxima leitura.
  function handleCadastrarDetectada(maquina) {
    const detectado = camposDetectados(maquina)
    panel.openEdit({
      // Sem `uid`: é registro NOVO. O formulário trata item sem uid como
      // criação (ver useCrudPanelState.handleSaveForm).
      id: maquina.hostname,
      categoria: maquina.tipoChassi === 'Notebook' ? 'Notebook' : 'Desktop',
      ...detectado,
    })
  }

  // Preenche os campos vazios da ficha com o que o agente detectou. Só o
  // que está em branco chega aqui (ver camposParaPreencher) — valor
  // digitado por uma pessoa nunca é sobrescrito.
  async function handlePreencherComDetectado(campos) {
    const alvo = panel.viewingItem
    if (!alvo) return
    try {
      await assetMutations.updateAsset.mutateAsync({
        assetUid: alvo.uid,
        record: { ...alvo, ...campos },
      })
    } catch {
      // createCrudMutations já mostra o toast de erro.
    }
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
          <Button
            size="sm"
            onClick={handleRefresh}
            {...bindTooltip('Buscar atualizações da equipe')}
          >
            <RefreshIcon /> Atualizar
          </Button>
          <Button size="sm" onClick={handleExport}>
            <DownloadIcon /> Exportar CSV
          </Button>
          {/* Atalho para a visão técnica das máquinas (quem parou de
              reportar, quem ainda tem HDD, busca por IP, programas
              instalados) — perguntas que a lista de ativos não responde.
              Só aparece quando há agente reportando: sem isso, levaria a
              uma tela vazia. */}
          {inventarioList.length > 0 && (
            <Button
              size="sm"
              as={Link}
              to={ROUTES.inventarioMaquinas}
              {...bindTooltip('Ver o que o agente detectou em cada máquina')}
            >
              <MonitorIcon /> Máquinas detectadas
            </Button>
          )}
          <Button variant="primary" onClick={panel.openNew}>
            + Novo ativo
          </Button>
        </div>
      </div>

      {/* Máquinas rodando na rede que ninguém cadastrou — some sozinho
          quando não há nenhuma. */}
      <MaquinasSemCadastro maquinas={semCadastro} onCadastrar={handleCadastrarDetectada} />

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

      {isLoading && <TableSkeleton columns={7} />}

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
        maquina={maquinaDoAtivo(panel.viewingItem, indiceInventario)}
        onPreencherComDetectado={handlePreencherComDetectado}
        preenchendo={assetMutations.updateAsset.isPending}
      />

      <AssetFormModal
        open={panel.formItem !== undefined}
        asset={panel.formItem}
        assets={list}
        contatos={contatosList}
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
