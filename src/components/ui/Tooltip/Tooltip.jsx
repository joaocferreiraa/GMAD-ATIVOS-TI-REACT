import styles from './Tooltip.module.css'

// Tooltip genérico que aparece no hover/foco do elemento filho (mesmo padrão
// visual do .sync-tooltip da Topbar, generalizado para qualquer conteúdo).
// `align="right"` alinha a borda direita da bolha ao gatilho (útil perto da
// borda da tela).
export default function Tooltip({ content, align = 'center', children }) {
  return (
    <span className={`${styles.wrap} ${align === 'right' ? styles.alignRight : ''}`} tabIndex={0}>
      {children}
      <span className={styles.bubble} role="tooltip">
        {content}
      </span>
    </span>
  )
}
