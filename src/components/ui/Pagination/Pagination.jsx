import { ChevronDownIcon } from '../Icon/icons'
import styles from './Pagination.module.css'

// Gera a lista de páginas a exibir, com "..." quando há muitas páginas.
function buildPageList(page, totalPages) {
  const pages = []
  const add = (p) => pages.push(p)
  const addGap = () => pages.push('…')

  add(1)
  if (page > 3) addGap()
  for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) add(p)
  if (page < totalPages - 2) addGap()
  if (totalPages > 1) add(totalPages)

  return pages
}

// Paginação genérica (não existe no sistema original — construída com os
// mesmos tokens visuais de botões/abas). `page` é 1-indexado.
export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const pages = buildPageList(page, totalPages)

  return (
    <nav className={styles.pagination} aria-label="Paginação">
      <button
        type="button"
        className={styles.pageBtn}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Página anterior"
      >
        <ChevronDownIcon style={{ transform: 'rotate(90deg)' }} />
      </button>

      {pages.map((p, index) =>
        p === '…' ? (
          <span key={`gap-${index}`} className={styles.ellipsis}>
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            className={`${styles.pageBtn} ${p === page ? styles.active : ''}`}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ),
      )}

      <button
        type="button"
        className={styles.pageBtn}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Próxima página"
      >
        <ChevronDownIcon style={{ transform: 'rotate(-90deg)' }} />
      </button>
    </nav>
  )
}
