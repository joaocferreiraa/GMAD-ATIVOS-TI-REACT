import { useState } from 'react'
import { useMonitores } from '../../hooks/data/useMonitores'
import { useMonitorMutations } from '../../hooks/data/useMonitorMutations'
import { useAssets } from '../../hooks/data/useAssets'
import { useInfra } from '../../hooks/data/useInfra'
import { useRecentMeasurements } from '../../hooks/data/useMedicoes'
import { useAlertas } from '../../hooks/data/useAlertas'
import { useMonitoramentoData } from './useMonitoramentoData'
import { useCrudPanelState } from '../../hooks/useCrudPanelState'
import { fmtRelTime } from '../../utils/formatters'
import Button from '../../components/ui/Button/Button'
import Card from '../../components/ui/Card/Card'
import TableSkeleton from '../../components/ui/TableSkeleton/TableSkeleton'
import Alert from '../../components/ui/Alert/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import SummaryBar from '../../components/monitoramento/SummaryBar/SummaryBar'
import LiveChartCard from '../../components/monitoramento/LiveChartCard/LiveChartCard'
import UnitStatusList from '../../components/monitoramento/UnitStatusList/UnitStatusList'
import MonitorFilters from '../../components/monitoramento/MonitorFilters/MonitorFilters'
import MonitorTable from '../../components/monitoramento/MonitorTable/MonitorTable'
import MonitorFormModal from '../../components/monitoramento/MonitorFormModal/MonitorFormModal'
import MonitorViewModal from '../../components/monitoramento/MonitorViewModal/MonitorViewModal'
import ImportInfraModal from '../../components/monitoramento/ImportInfraModal/ImportInfraModal'
import SpeedTestPanel from '../../components/monitoramento/SpeedTestPanel/SpeedTestPanel'
import AlertsPanel from '../../components/monitoramento/AlertsPanel/AlertsPanel'
import styles from './MonitoramentoRedePage.module.css'

const DEFAULT_FILTERS = {
  unidade: 'Todas',
  tipo: 'Todos',
  search: '',
}

export default function MonitoramentoRedePage() {
  const { data: monitores, isLoading, isError } = useMonitores()
  const { data: assets } = useAssets()
  const { data: infra } = useInfra()
  const monitorMutations = useMonitorMutations()
  // Janela de 60min é suficiente pra status atual + detecção de oscilação
  // (ver utils/networkStatus.js); o histórico de período maior é buscado
  // sob demanda só quando a ficha de um ponto é aberta.
  const { data: recentMeasurements, isLoading: isLoadingMeasurements } = useRecentMeasurements(60)
  const { data: alerts } = useAlertas({})

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [importOpen, setImportOpen] = useState(false)

  const list = monitores ?? []
  const assetList = assets ?? []
  const measurementsList = recentMeasurements ?? []
  const alertsList = alerts ?? []

  const data = useMonitoramentoData(list, assetList, measurementsList, filters)
  const panel = useCrudPanelState({
    list,
    uidParam: 'monitorUid',
    mutations: {
      create: monitorMutations.createMonitor,
      update: monitorMutations.updateMonitor,
      remove: monitorMutations.deleteMonitor,
    },
  })

  // O item aberto na ficha precisa do status já calculado (statusInfo) —
  // panel.viewingItem vem da lista crua (config), então buscamos a versão
  // com status em data.rows quando disponível, e caímos pro item cru fora
  // do filtro atual.
  const viewingWithStatus = panel.viewingItem
    ? (data.rows.find((m) => m.uid === panel.viewingItem.uid) ?? {
        ...panel.viewingItem,
        statusInfo: { status: 'sem-dados', detalhe: null },
      })
    : null

  const monitorNameByUid = Object.fromEntries(list.map((m) => [m.uid, m.nome]))

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  function handleClearFilters() {
    setFilters(DEFAULT_FILTERS)
  }

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Monitoramento de Rede</h2>
          <p>Acompanhe a qualidade e estabilidade das conexões monitoradas.</p>
        </div>
        <div className={styles.liveIndicator}>
          <span className={styles.liveDot} />
          {data.summary.ultimaVerificacao
            ? `Última atualização: ${fmtRelTime(data.summary.ultimaVerificacao)}`
            : 'Aguardando primeira medição'}
        </div>
      </div>

      {isLoading && <TableSkeleton columns={6} />}

      {isError && (
        <Alert variant="danger">
          Não foi possível carregar o monitoramento. Verifique sua conexão.
        </Alert>
      )}

      {!isLoading && !isError && (
        <>
          <SummaryBar
            items={[
              { label: 'Conexões monitoradas', value: data.summary.total },
              { label: 'Online', value: data.summary.online, tone: 'ok' },
              { label: 'Atenção', value: data.summary.atencao, tone: 'warn' },
              { label: 'Problemas', value: data.summary.problemas, tone: 'danger' },
              {
                label: 'Última verificação',
                value: data.summary.ultimaVerificacao
                  ? fmtRelTime(data.summary.ultimaVerificacao)
                  : '—',
              },
            ]}
          />

          <Card
            title="Velocidade da conexão em tempo real"
            subtitle="Atualiza sozinho conforme novas medições chegam — sem precisar recarregar a página"
          >
            <LiveChartCard monitors={data.allMonitors} />
          </Card>

          <Card>
            <SpeedTestPanel unidade={filters.unidade} />
          </Card>

          <UnitStatusList
            units={data.unitStatus}
            selected={filters.unidade}
            onSelect={(unidade) => updateFilters({ unidade })}
          />

          <div className={styles.actionsRow}>
            <MonitorFilters
              filters={filters}
              unidades={data.unidades}
              onChange={updateFilters}
              onClear={handleClearFilters}
            />
            <div className={styles.actionsButtons}>
              <Button onClick={() => setImportOpen(true)}>Importar da Infraestrutura</Button>
              <Button variant="primary" onClick={panel.openNew}>
                + Novo ponto
              </Button>
            </div>
          </div>

          {isLoadingMeasurements && !measurementsList.length ? (
            <TableSkeleton columns={6} />
          ) : (
            <MonitorTable
              rows={data.rows}
              onView={(m) => panel.openView(m.uid)}
              onEdit={panel.openEdit}
              onDelete={panel.requestDelete}
            />
          )}

          <Card
            title="Alertas recentes"
            subtitle="Eventos gerados quando um ponto sai dos limites configurados"
          >
            <AlertsPanel alerts={alertsList} monitorNameByUid={monitorNameByUid} />
          </Card>
        </>
      )}

      <MonitorViewModal
        open={!!viewingWithStatus}
        item={viewingWithStatus}
        onClose={panel.closeView}
        onEdit={panel.openEditFromView}
      />

      <MonitorFormModal
        open={panel.formItem !== undefined}
        item={panel.formItem}
        assets={assetList}
        onClose={panel.closeForm}
        onSave={panel.handleSaveForm}
        onDelete={panel.handleDeleteFromForm}
      />

      <ImportInfraModal
        open={importOpen}
        infra={infra}
        monitores={list}
        onClose={() => setImportOpen(false)}
        onImportOne={(record) => monitorMutations.createMonitor.mutateAsync(record)}
      />

      <ConfirmDialog
        open={!!panel.pendingDelete}
        title="Excluir ponto monitorado?"
        message={
          panel.pendingDelete
            ? `O ponto "${panel.pendingDelete.nome}" será removido do monitoramento. O histórico de medições já registrado é mantido.`
            : ''
        }
        confirmLabel="Excluir"
        onConfirm={panel.handleConfirmDelete}
        onCancel={panel.cancelDelete}
      />
    </div>
  )
}
