import Table from '../../ui/Table/Table'
import RowActions from '../../ui/Table/RowActions'
import { COLUMNS } from './columns'

// Tabela de pontos monitorados — clique na linha abre a ficha do ponto
// (histórico, eventos), botões de ação editam/excluem a configuração.
export default function MonitorTable({ rows, onView, onEdit, onDelete }) {
  const columns = [
    ...COLUMNS,
    {
      key: 'acoes',
      label: '',
      render: (m) => <RowActions item={m} onEdit={onEdit} onDelete={onDelete} />,
    },
  ]

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey="uid"
      onRowClick={onView}
      emptyTitle="Nenhum ponto monitorado"
      emptyMessage="Cadastre um servidor, roteador, Wi-Fi ou link de internet para começar a monitorar."
    />
  )
}
