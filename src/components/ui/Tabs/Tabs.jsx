import styles from './Tabs.module.css'

// Título opcional que agrupa um subconjunto de abas (.tab-group-label).
export function TabGroupLabel({ className = '', children, ...props }) {
  return (
    <div className={`${styles.groupLabel} ${className}`} {...props}>
      {children}
    </div>
  )
}

// Grupo de abas usado como filtro (unidade, categoria, tipo...) — .tabgroup/
// .tab do sistema original. `items`: [{ value, label, count? }].
export default function Tabs({ items, value, onChange, className = '', children }) {
  return (
    <div className={`${styles.tabgroup} ${className}`}>
      {children}
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          className={`${styles.tab} ${item.value === value ? styles.active : ''}`}
          onClick={() => onChange(item.value)}
        >
          <span>{item.label}</span>
          {item.count !== undefined && <span className={styles.count}>{item.count}</span>}
        </button>
      ))}
    </div>
  )
}
