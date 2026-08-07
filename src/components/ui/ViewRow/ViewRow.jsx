import styles from '../../../styles/viewPanel.module.css'

// Linha label/valor de uma ficha somente-leitura — duplicada de forma
// idêntica em AssetViewModal, InstallerDrawer e ScriptDrawer, extraída aqui.
export default function ViewRow({ label, value, raw }) {
  return (
    <div className={styles.viewRow}>
      <div className={styles.vrLabel}>{label}</div>
      <div className={styles.vrValue}>{raw ? value : value || 'Não informado'}</div>
    </div>
  )
}
