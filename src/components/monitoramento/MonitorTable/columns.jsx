import Badge from '../../ui/Badge/Badge'
import tableStyles from '../../ui/Table/Table.module.css'
import { unitDisplayName } from '../../../utils/formatters'
import { STATUS_LABEL, statusBadgeVariant } from '../../../utils/networkStatus'

function fmtValue(value, unidade) {
  return value === null || value === undefined ? '—' : `${value} ${unidade}`
}

// Colunas da tabela de pontos monitorados. `row` já chega com `statusInfo`
// e `ultimaMedicao` calculados em useMonitoramentoData.js (nunca aqui —
// columns.jsx só formata o que já foi derivado).
export const COLUMNS = [
  {
    key: 'nome',
    label: 'Ponto',
    render: (m) => (
      <div className={tableStyles.cellStack}>
        <b>{m.nome}</b>
        <span>{m.host}</span>
      </div>
    ),
  },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (m) => <span className={tableStyles.muted}>{m.tipo}</span>,
  },
  { key: 'unidade', label: 'Unidade', render: (m) => unitDisplayName(m.unidade) || '—' },
  {
    key: 'latencia',
    label: 'Latência',
    render: (m) => (
      <span className={tableStyles.mono}>{fmtValue(m.ultimaMedicao?.latenciaMs, 'ms')}</span>
    ),
  },
  {
    key: 'perda',
    label: 'Perda',
    render: (m) => (
      <span className={tableStyles.mono}>{fmtValue(m.ultimaMedicao?.packetLossPct, '%')}</span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (m) => (
      <Badge variant={statusBadgeVariant(m.statusInfo.status)}>
        {STATUS_LABEL[m.statusInfo.status]}
      </Badge>
    ),
  },
]
