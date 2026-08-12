import { useState } from 'react'
import EmptyState from '../EmptyState/EmptyState'
import Button from '../Button/Button'
import { ChevronDownIcon } from '../Icon/icons'
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
// paginate: false desliga a paginação (padrão ligada, pageSize configurável)
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
  paginate = true,
  pageSize = 15,
}) {
  const getRowKey = typeof rowKey === 'function' ? rowKey : (row) => row[rowKey]
  const [page, setPage] = useState(1)
  const [prevRows, setPrevRows] = useState(rows)

  // Volta pra primeira página sempre que o conjunto filtrado/ordenado mudar
  // (nova referência de `rows` a cada mudança de filtro, busca ou ordenação).
  // Ajustado durante a renderização (não em efeito) — padrão recomendado
  // pelo React para "resetar estado quando uma prop muda".
  if (rows !== prevRows) {
    setPrevRows(rows)
    setPage(1)
  }

  if (!rows.length) {
    return (
      <div className={styles.tableWrap}>
        <EmptyState title={emptyTitle}>{emptyMessage}</EmptyState>
      </div>
    )
  }

  const pageCount = paginate ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1
  const currentPage = Math.min(page, pageCount)
  const pageRows = paginate
    ? rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)
    : rows
  const rangeStart = paginate ? (currentPage - 1) * pageSize + 1 : 1
  const rangeEnd = paginate ? Math.min(currentPage * pageSize, rows.length) : rows.length

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
          {pageRows.map((row, index) => (
            <tr
              key={getRowKey(row)}
              className={onRowClick ? styles.clickable : ''}
              style={{ '--i': index }}
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
      {paginate && pageCount > 1 && (
        <div className={styles.pagination}>
          <span className={styles.pageInfo}>
            {rangeStart}–{rangeEnd} de {rows.length}
          </span>
          <div className={styles.pageButtons}>
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              aria-label="Página anterior"
            >
              <ChevronDownIcon className={styles.prevIcon} />
            </Button>
            <span className={styles.pageCurrent}>
              {currentPage} / {pageCount}
            </span>
            <Button
              size="sm"
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
              disabled={currentPage === pageCount}
              aria-label="Próxima página"
            >
              <ChevronDownIcon className={styles.nextIcon} />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
