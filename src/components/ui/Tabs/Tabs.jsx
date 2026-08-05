import styles from './Tabs.module.css'

// Título opcional que agrupa um subconjunto de abas (.tab-group-label).
export function TabGroupLabel({ className = '', children, ...props }) {
  return (
    <div className={`${styles.groupLabel} ${className}`} {...props}>
      {children}
    </div>
  )
}

// Uma aba individual (.tab), para composição manual junto com TabGroupLabel
// quando a lista de abas tem grupos intercalados (ex.: abas de unidade).
export function Tab({ active, count, onClick, children }) {
  return (
    <button
      type="button"
      className={`${styles.tab} ${active ? styles.active : ''}`}
      onClick={onClick}
    >
      <span>{children}</span>
      {count !== undefined && <span className={styles.count}>{count}</span>}
    </button>
  )
}

// Grupo de abas usado como filtro (unidade, categoria, tipo...) — .tabgroup/
// .tab do sistema original. Passe `items`: [{ value, label, count? }] para o
// caso simples (uma lista plana), ou omita e componha livremente com `Tab`/
// `TabGroupLabel` como children quando houver grupos intercalados.
export default function Tabs({ items = [], value, onChange, className = '', children }) {
  return (
    <div className={`${styles.tabgroup} ${className}`}>
      {children}
      {items.map((item) => (
        <Tab
          key={item.value}
          active={item.value === value}
          count={item.count}
          onClick={() => onChange(item.value)}
        >
          {item.label}
        </Tab>
      ))}
    </div>
  )
}
