import Table from '../../ui/Table/Table'
import RowActions from '../../ui/Table/RowActions'
import { buildColumns } from './columns'

// Tabela de Contatos (#contatoTable do sistema original): clique na linha
// abre a ficha de visualização, botões de ação editam/excluem diretamente.
export default function ContatoTable({
  rows,
  gestorMap,
  assets,
  sortKey,
  sortDir,
  onSort,
  onView,
  onEdit,
  onDelete,
}) {
  const columns = [
    ...buildColumns(gestorMap, assets),
    {
      key: 'acoes',
      label: '',
      render: (c) => <RowActions item={c} onEdit={onEdit} onDelete={onDelete} />,
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
      emptyTitle="Nenhum colaborador encontrado"
      emptyMessage="Ajuste os filtros ou cadastre um novo colaborador."
    />
  )
}
