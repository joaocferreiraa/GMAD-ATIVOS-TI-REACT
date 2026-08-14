import { useState } from 'react'
import Modal from '../../ui/Modal/Modal'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import ViewRow from '../../ui/ViewRow/ViewRow'
import RealtimeChart from '../RealtimeChart/RealtimeChart'
import { unitDisplayName, fmtRelTime } from '../../../utils/formatters'
import { STATUS_LABEL, statusBadgeVariant } from '../../../utils/networkStatus'
import { useMonitorHistory } from '../../../hooks/data/useMedicoes'
import { useAlertas } from '../../../hooks/data/useAlertas'
import { HISTORICO_PERIODOS, ALERTS_PREVIEW_LIMIT } from '../../../constants/monitoramento'
import panelStyles from '../MonitoramentoPanel.module.css'

function fmtNum(value, unidade) {
  return value === null || value === undefined ? 'Medição indisponível' : `${value} ${unidade}`
}

// Ficha de visualização de um ponto monitorado — status atual, histórico
// (gráfico) e eventos/alertas recentes daquele ponto. Ao contrário das
// fichas de Ativos/Contatos, os dados aqui não vêm de `item` (que só tem a
// config do ponto) — status/histórico/eventos são buscados à parte
// (ver useMonitorHistory/useAlertas), porque vivem em tabelas relacionais,
// não no kv_store.
export default function MonitorViewModal({ open, item, onClose, onEdit }) {
  const [periodoValue, setPeriodoValue] = useState('1h')
  const [metric, setMetric] = useState('latenciaMs')

  const periodo = HISTORICO_PERIODOS.find((p) => p.value === periodoValue) || HISTORICO_PERIODOS[1]
  const { data: measurements, isLoading } = useMonitorHistory(item?.uid, periodo.minutes)
  const { data: alerts } = useAlertas({})

  if (!item) return null

  const pointAlerts = (alerts || [])
    .filter((a) => a.monitorUid === item.uid)
    .slice(0, ALERTS_PREVIEW_LIMIT)

  const disponibilidadePct =
    measurements && measurements.length
      ? ((measurements.filter((m) => m.disponivel).length / measurements.length) * 100).toFixed(2)
      : null

  const latest = measurements && measurements.length ? measurements[measurements.length - 1] : null
  const statusInfo = item.statusInfo || { status: 'sem-dados', detalhe: null }

  return (
    <Modal open={open} onClose={onClose} showCloseButton={false} maxWidth="720px">
      <div className={panelStyles.viewHeaderRow}>
        <div>
          <h2 className={panelStyles.viewHeadTitle}>{item.nome}</h2>
          <div className={panelStyles.viewHeadSub}>{item.host}</div>
          <div className={panelStyles.viewHeadBadge}>
            <Badge variant={statusBadgeVariant(statusInfo.status)}>
              {STATUS_LABEL[statusInfo.status]}
            </Badge>
          </div>
          {statusInfo.detalhe && (
            <div className={panelStyles.viewHeadMeta}>{statusInfo.detalhe}</div>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={onEdit}>
          Editar ponto
        </Button>
      </div>

      <div className={panelStyles.viewSection}>
        <div className={panelStyles.viewSectionTitle}>Informações gerais</div>
        <div className={panelStyles.viewRows}>
          <ViewRow label="Tipo" value={item.tipo} />
          <ViewRow label="Unidade" value={unitDisplayName(item.unidade)} />
          <ViewRow label="Descrição" value={item.descricao} />
          <ViewRow
            label="Disponibilidade no período"
            value={
              disponibilidadePct !== null ? `${disponibilidadePct}%` : 'Sem medições no período'
            }
          />
          <ViewRow label="Latência atual" value={fmtNum(latest?.latenciaMs, 'ms')} raw />
          <ViewRow label="Packet loss atual" value={fmtNum(latest?.packetLossPct, '%')} raw />
          <ViewRow
            label="Última verificação"
            value={latest ? fmtRelTime(latest.createdAt) : 'Nenhuma medição ainda'}
          />
        </div>
      </div>

      <div className={panelStyles.viewSection}>
        <div className={panelStyles.viewSectionTitle}>Histórico</div>
        <RealtimeChart
          measurements={measurements}
          metric={metric}
          onMetricChange={setMetric}
          periodo={periodoValue}
          onPeriodoChange={setPeriodoValue}
          isLoading={isLoading}
        />
      </div>

      <div className={panelStyles.viewSection}>
        <div className={panelStyles.viewSectionTitle}>Eventos recentes</div>
        {pointAlerts.length ? (
          <div className={panelStyles.eventsList}>
            {pointAlerts.map((a) => (
              <div key={a.id} className={panelStyles.eventRow}>
                <span className={panelStyles.eventTime}>
                  {new Date(a.createdAt).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span className={panelStyles.eventMsg}>
                  {a.mensagem}
                  {a.resolvido ? ' (normalizado)' : ''}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--text-faint)', fontSize: 12.5 }}>
            Nenhum evento registrado para este ponto ainda.
          </p>
        )}
      </div>
    </Modal>
  )
}
