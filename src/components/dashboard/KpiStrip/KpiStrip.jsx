import styles from './KpiStrip.module.css'

const TONE_CLASS = { green: 'iconGreen', orange: 'iconOrange' }

function Tile({ icon: Icon, tone, value, label }) {
  return (
    <div className={styles.tile}>
      <div className={`${styles.icon} ${styles[TONE_CLASS[tone]]}`}>
        <Icon />
      </div>
      <div className={styles.text}>
        <div className={styles.value}>{value}</div>
        <div className={styles.label}>{label}</div>
      </div>
    </div>
  )
}

// Faixa de KPIs do Dashboard (.kpis do sistema original): grupo de inventário
// (total + por categoria + unidades) e grupo financeiro (valor investido).
export default function KpiStrip({ inventoryTiles, financeTiles }) {
  return (
    <div className={styles.kpis}>
      <div className={`${styles.group} ${styles.inventory}`}>
        {inventoryTiles.map((tile) => (
          <Tile key={tile.label} {...tile} />
        ))}
      </div>
      <div className={`${styles.group} ${styles.finance}`}>
        {financeTiles.map((tile) => (
          <Tile key={tile.label} {...tile} />
        ))}
      </div>
    </div>
  )
}
