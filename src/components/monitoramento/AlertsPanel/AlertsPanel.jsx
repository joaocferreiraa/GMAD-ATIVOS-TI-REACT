import Badge from '../../ui/Badge/Badge'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import { fmtRelTime } from '../../../utils/formatters'
import styles from './AlertsPanel.module.css'

// Lista de alertas recentes (offline, latência, packet loss, velocidade
// abaixo do limite, oscilação — ver utils/networkStatus.js e
// services/monitoramento/measurementsService.js). Só mostra o que foi
// registrado de verdade: sem alerta gerado, sem linha aqui.
export default function AlertsPanel({ alerts, monitorNameByUid }) {
  if (!alerts.length) {
    return <EmptyHint>Nenhum alerta registrado — tudo dentro dos limites configurados.</EmptyHint>
  }

  return (
    <div className={styles.list}>
      {alerts.map((a) => (
        <div key={a.id} className={`${styles.row} ${a.resolvido ? styles.resolved : ''}`}>
          <Badge variant={a.severidade === 'problema' ? 'danger' : 'warn'}>
            {a.severidade === 'problema' ? 'Problema' : 'Atenção'}
          </Badge>
          <div className={styles.content}>
            <b>{monitorNameByUid[a.monitorUid] || 'Ponto removido'}</b>
            <span>
              {a.mensagem}
              {a.resolvido ? ' — normalizado' : ''}
            </span>
          </div>
          <span className={styles.time}>{fmtRelTime(a.createdAt)}</span>
        </div>
      ))}
    </div>
  )
}
