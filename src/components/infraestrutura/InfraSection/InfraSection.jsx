import { ChevronDownIcon } from '../../ui/Icon/icons'
import styles from '../InfraAccordion.module.css'

// Seção colapsável do acordeão de Infraestrutura (infraSectionHtml() do
// sistema original) — cabeçalho com ícone/título/ações + corpo mostrado só
// quando `open`.
export default function InfraSection({ sectionKey, title, icon: Icon, open, onToggle, children }) {
  return (
    <div className={`${styles.sec} ${open ? styles.open : ''}`}>
      <button type="button" className={styles.head} onClick={() => onToggle(sectionKey)}>
        <span className={styles.title}>
          <span className={styles.si}>
            <Icon />
          </span>
          {title}
        </span>
        <span className={styles.headRight}>
          <span className={styles.chevron}>
            <ChevronDownIcon />
          </span>
        </span>
      </button>
      {open && <div className={styles.body}>{children}</div>}
    </div>
  )
}
