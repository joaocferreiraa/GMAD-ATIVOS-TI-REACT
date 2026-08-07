import Table from '../../ui/Table/Table'
import RowActions from '../../ui/Table/RowActions'
import { COLUMNS } from './columns'

// Tabela de Estoque (#stockTable do sistema original): clique na linha abre
// a ficha de visualização, botões de ação editam/excluem diretamente.
export default function StockTable({ rows, onView, onEdit, onDelete }) {
  const columns = [
    ...COLUMNS,
    {
      key: 'acoes',
      label: '',
      render: (i) => <RowActions item={i} onEdit={onEdit} onDelete={onDelete} />,
    },
  ]

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey="uid"
      onRowClick={onView}
      emptyTitle="Nenhum item em estoque"
      emptyMessage="Cadastre peças, periféricos ou dispositivos disponíveis para uso futuro."
    />
  )
}
