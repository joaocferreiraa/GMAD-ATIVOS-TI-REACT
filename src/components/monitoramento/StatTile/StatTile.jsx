import styles from './StatTile.module.css'

// Card de número grande — o "single stat" dos dashboards de Grafana/Zabbix
// (os blocos "Host uptime", "System load", "Zabbix NVPS" do painel de
// referência). Um número, um rótulo, e cor semântica opcional.
//
// `tone`: 'ok' | 'warn' | 'danger' | 'none'. `value` já vem formatado (ou
// '—' quando não há medição — nunca 0 no lugar de ausente).
export default function StatTile({ label, value, unidade = '', hint = null, tone = 'none' }) {
  return (
    <div className={`${styles.tile} ${styles[tone] ?? ''}`}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {value}
        {unidade && <span className={styles.unit}>{unidade}</span>}
      </span>
      {hint && <span className={styles.hint}>{hint}</span>}
    </div>
  )
}
