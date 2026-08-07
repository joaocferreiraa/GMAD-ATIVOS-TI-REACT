import EmptyState from '../EmptyState/EmptyState'
import styles from './Table.module.css'

const TD_VARIANT_CLASS = {
  muted: styles.muted,
  mono: styles.mono,
}

// Tabela genérica e responsiva (.table-wrap / table do sistema original —
// no mobile vira "cartões" via data-label, sem precisar de outro componente).
//
// columns: [{ key, label, render(row), sortable, variant: 'muted'|'mono' }]
// rows: array de objetos
// rowKey: nome do campo (string) ou função (row) => string
export default function Table({
  columns,
  rows,
  rowKey,
  sortKey,
  sortDir,
  onSort,
  onRowClick,
  emptyTitle = 'Nenhum registro encontrado',
  emptyMessage,
}) {
  const getRowKey = typeof rowKey === 'function' ? rowKey : (row) => row[rowKey]

  if (!rows.length) {
    return (
      <div className={styles.tableWrap}>
        <EmptyState title={emptyTitle}>{emptyMessage}</EmptyState>
      </div>
    )
  }

  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={[
                  column.sortable ? styles.sortable : '',
                  sortKey === column.key ? styles.sorted : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={column.sortable ? () => onSort(column.key) : undefined}
                tabIndex={column.sortable ? 0 : undefined}
                role={column.sortable ? 'button' : undefined}
                onKeyDown={
                  column.sortable
                    ? (event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          onSort(column.key)
                        }
                      }
                    : undefined
                }
                aria-sort={
                  column.sortable && sortKey === column.key
                    ? sortDir === -1
                      ? 'descending'
                      : 'ascending'
                    : undefined
                }
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              className={onRowClick ? styles.clickable : ''}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              tabIndex={onRowClick ? 0 : undefined}
              role={onRowClick ? 'button' : undefined}
              onKeyDown={
                onRowClick
                  ? (event) => {
                      // Ignora eventos que borbulharam de botões de ação dentro da
                      // linha (Editar/Excluir/Baixar/Favoritar) — só a própria
                      // linha focada deve abrir a ficha de visualização.
                      if (event.target !== event.currentTarget) return
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        onRowClick(row)
                      }
                    }
                  : undefined
              }
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.label}
                  className={TD_VARIANT_CLASS[column.variant] || ''}
                >
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
