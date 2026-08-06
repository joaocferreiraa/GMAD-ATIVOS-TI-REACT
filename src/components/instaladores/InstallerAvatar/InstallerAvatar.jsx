import { initials } from '../../../utils/formatters'
import styles from './InstallerAvatar.module.css'

// Círculo com as iniciais do programa (.avatar do sistema original) — usado
// na tabela (tamanho padrão) e no cabeçalho do drawer (`size="lg"`).
export default function InstallerAvatar({ nome, size }) {
  return (
    <div className={`${styles.avatar} ${size === 'lg' ? styles.lg : ''}`}>
      {initials(nome || '--')}
    </div>
  )
}
