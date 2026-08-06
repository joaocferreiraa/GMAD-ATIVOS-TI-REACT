import Table from '../../ui/Table/Table'
import Button from '../../ui/Button/Button'
import tableStyles from '../../ui/Table/Table.module.css'
import { EditIcon, TrashIcon } from '../../ui/Icon/icons'
import { COLUMNS } from './columns'

// Tabela de Estoque (#stockTable do sistema original): clique na linha abre
// a ficha de visualização, botões de ação editam/excluem diretamente.
export default function StockTable({ rows, onView, onEdit, onDelete }) {
  const columns = [
    ...COLUMNS,
    {
      key: 'acoes',
      label: '',
      render: (i) => (
        <div className={tableStyles.rowActions}>
          <Button
            variant="ghost"
            size="sm"
            title="Editar"
            aria-label="Editar"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(i)
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
              onDelete(i)
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
      onRowClick={onView}
      emptyTitle="Nenhum item em estoque"
      emptyMessage="Cadastre peças, periféricos ou dispositivos disponíveis para uso futuro."
    />
  )
}
