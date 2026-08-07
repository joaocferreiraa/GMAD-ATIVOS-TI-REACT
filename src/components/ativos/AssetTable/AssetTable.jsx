import Table from '../../ui/Table/Table'
import RowActions from '../../ui/Table/RowActions'
import { COLUMNS } from './columns'

// Tabela de ativos (#assetTable do sistema original): colunas variam por
// categoria selecionada nas abas, clique na linha abre os detalhes, e os
// botões de ação editam/excluem diretamente.
export default function AssetTable({
  categoria,
  rows,
  sortKey,
  sortDir,
  onSort,
  onView,
  onEdit,
  onDelete,
}) {
  const columns = [
    ...(COLUMNS[categoria] || COLUMNS.Todos),
    {
      key: 'acoes',
      label: '',
      render: (a) => <RowActions item={a} onEdit={onEdit} onDelete={onDelete} />,
    },
  ]

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey="uid"
      sortKey={sortKey}
      sortDir={sortDir}
      onSort={onSort}
      onRowClick={onView}
      emptyTitle="Nenhum ativo encontrado"
      emptyMessage="Ajuste os filtros ou cadastre um novo ativo."
    />
  )
}
