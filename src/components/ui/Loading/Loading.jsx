import { SpinnerIcon } from '../Icon/icons'
import styles from './Loading.module.css'

const SIZE_CLASS = { sm: styles.sm, md: styles.md, lg: styles.lg }

// Indicador de carregamento genérico (sem equivalente no sistema original).
// Use `label` para um texto ao lado (ex.: "Carregando...") ou omita para só o spinner.
export default function Loading({ size = 'md', label }) {
  return (
    <span className={styles.wrap}>
      <SpinnerIcon className={`${styles.spinner} ${SIZE_CLASS[size]}`} />
      {label && <span>{label}</span>}
    </span>
  )
}
