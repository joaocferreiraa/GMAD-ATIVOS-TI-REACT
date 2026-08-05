import Table from '../../ui/Table/Table'
import Button from '../../ui/Button/Button'
import tableStyles from '../../ui/Table/Table.module.css'
import { EditIcon, TrashIcon } from '../../ui/Icon/icons'
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
      render: (c) => (
        <div className={tableStyles.rowActions}>
          <Button
            variant="ghost"
            size="sm"
            title="Editar"
            aria-label="Editar"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(c)
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
              onDelete(c)
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
      emptyTitle="Nenhum colaborador encontrado"
      emptyMessage="Ajuste os filtros ou cadastre um novo colaborador."
    />
  )
}
