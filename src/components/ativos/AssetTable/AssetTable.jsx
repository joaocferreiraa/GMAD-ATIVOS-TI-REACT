import Table from '../../ui/Table/Table'
import Button from '../../ui/Button/Button'
import tableStyles from '../../ui/Table/Table.module.css'
import { EditIcon, TrashIcon } from '../../ui/Icon/icons'
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
      render: (a) => (
        <div className={tableStyles.rowActions}>
          <Button
            variant="ghost"
            size="sm"
            title="Editar"
            aria-label="Editar"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(a)
            }}
          >
            <EditIcon />
          </Button>
          <Button
            variant="dangerGhost"
            size="sm"
            title="Excluir"
            aria-label="Excluir"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(a)
            }}
          >
            <TrashIcon />
          </Button>
        </div>
      ),
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
