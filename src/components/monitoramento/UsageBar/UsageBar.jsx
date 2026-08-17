import { usoTone } from '../../../utils/hostFormatters'
import styles from './UsageBar.module.css'

// Barra horizontal de uso de recurso (CPU/memória/disco) — o formato que
// Zabbix/Grafana usam pra saturação: a barra dá a proporção de relance, o
// número dá o valor exato.
//
// `pct` null = sem medição: a barra fica vazia e o detalhe mostra "—", em
// vez de desenhar 0% como se o recurso estivesse ocioso.
export default function UsageBar({ label, pct, detalhe, limites }) {
  const tone = usoTone(pct, limites)
  const temValor = pct !== null && pct !== undefined && !Number.isNaN(pct)
  const largura = temValor ? Math.min(Math.max(pct, 0), 100) : 0

  return (
    <div className={styles.wrap}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={styles.detalhe}>{temValor ? detalhe : '—'}</span>
      </div>
      <div
        className={styles.track}
        role="progressbar"
        aria-valuenow={temValor ? Math.round(pct) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div className={`${styles.fill} ${styles[tone] ?? ''}`} style={{ width: `${largura}%` }} />
      </div>
    </div>
  )
}
