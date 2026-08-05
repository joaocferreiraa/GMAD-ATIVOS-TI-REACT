import styles from './Toolbar.module.css'

// Barra de filtros (.toolbar do sistema original). Composição livre: coloque
// SearchInput, Select e Button (ex.: "Limpar filtros") como filhos.
export default function Toolbar({ className = '', children, ...props }) {
  return (
    <div className={`${styles.toolbar} ${className}`} {...props}>
      {children}
    </div>
  )
}
