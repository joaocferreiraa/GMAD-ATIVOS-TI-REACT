import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from '../../constants/routes'
import { useMonitores } from '../../hooks/data/useMonitores'
import { useMonitorMutations } from '../../hooks/data/useMonitorMutations'
import { useAssets } from '../../hooks/data/useAssets'
import { useRecentMeasurements } from '../../hooks/data/useMedicoes'
import { useAlertas } from '../../hooks/data/useAlertas'
import { useMonitoramentoData } from './useMonitoramentoData'
import { ALERTS_PREVIEW_LIMIT } from '../../constants/monitoramento'
import { useCrudPanelState } from '../../hooks/useCrudPanelState'
import { fmtRelTime } from '../../utils/formatters'
import Button from '../../components/ui/Button/Button'
import Card from '../../components/ui/Card/Card'
import TableSkeleton from '../../components/ui/TableSkeleton/TableSkeleton'
import Alert from '../../components/ui/Alert/Alert'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import SummaryBar from '../../components/ui/SummaryBar/SummaryBar'
import LiveChartCard from '../../components/monitoramento/LiveChartCard/LiveChartCard'
import ComparativeChartCard from '../../components/monitoramento/ComparativeChartCard/ComparativeChartCard'
import MetricsGridCard from '../../components/monitoramento/MetricsGridCard/MetricsGridCard'
import UnitStatusList from '../../components/monitoramento/UnitStatusList/UnitStatusList'
import MonitorFilters from '../../components/monitoramento/MonitorFilters/MonitorFilters'
import MonitorTable from '../../components/monitoramento/MonitorTable/MonitorTable'
import MonitorFormModal from '../../components/monitoramento/MonitorFormModal/MonitorFormModal'
import MonitorViewModal from '../../components/monitoramento/MonitorViewModal/MonitorViewModal'
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
  const monitorMutations = useMonitorMutations()
  // Janela de 60min é suficiente pra status atual + detecção de oscilação
  // (ver utils/networkStatus.js); o histórico de período maior é buscado
  // sob demanda só quando a ficha de um ponto é aberta.
  const { data: recentMeasurements, isLoading: isLoadingMeasurements } = useRecentMeasurements(60)
  const { data: alerts } = useAlertas({})

  const [filters, setFilters] = useState(DEFAULT_FILTERS)

  const list = monitores ?? []
  const assetList = assets ?? []
  const measurementsList = recentMeasurements ?? []
  // A busca já limita a 200 (ver useAlertas/getAlerts), mas a tela principal
  // só precisa dos mais recentes pra não virar uma lista que cresce sem fim
  // — mesmo teto usado na ficha de um ponto (ver MonitorViewModal).
  const alertsList = (alerts ?? []).slice(0, ALERTS_PREVIEW_LIMIT)

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
        <div className={styles.headingActions}>
          <Link to={ROUTES.monitoramentoPainel} className={styles.painelLink}>
            Painel de Infraestrutura →
          </Link>
          <div className={styles.liveIndicator}>
            <span className={styles.liveDot} />
            {data.summary.ultimaVerificacao
              ? `Última atualização: ${fmtRelTime(data.summary.ultimaVerificacao)}`
              : 'Aguardando primeira medição'}
          </div>
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
          {/* "Última verificação" já aparece no indicador ao lado do título
              (styles.liveIndicator) — não repete aqui como um quinto item. */}
          <SummaryBar
            items={[
              { label: 'Conexões monitoradas', value: data.summary.total },
              { label: 'Online', value: data.summary.online, tone: 'ok' },
              { label: 'Atenção', value: data.summary.atencao, tone: 'warn' },
              { label: 'Problemas', value: data.summary.problemas, tone: 'danger' },
            ]}
          />

          <Card title="Monitoramento em tempo real" subtitle="Atualiza sozinho conforme chegam novas medições do agente.">
            <LiveChartCard monitors={data.allMonitors} />
          </Card>

          <Card
            title="Comparativo entre pontos"
            subtitle="Todos os pontos no mesmo gráfico. Arraste para dar zoom; clique nas pastilhas para mostrar ou ocultar um ponto."
          >
            <ComparativeChartCard monitors={data.allMonitors} />
          </Card>

          <Card
            title="Painel de métricas"
            subtitle="Latência, perda de pacotes e disponibilidade lado a lado, no mesmo período."
          >
            <MetricsGridCard monitors={data.allMonitors} />
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
            <Button variant="primary" onClick={panel.openNew}>
              + Novo ponto
            </Button>
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
            subtitle="Últimos eventos gerados quando um ponto saiu dos limites configurados"
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
