import { useState } from 'react'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import { useResolveAlert } from '../../../hooks/data/useAlertas'
import { useToast } from '../../../hooks/useToast'
import { fmtRelTime } from '../../../utils/formatters'
import { CheckIcon } from '../../ui/Icon/icons'
import styles from './AlertsPanel.module.css'

// Lista de alertas recentes (offline, latência, packet loss, velocidade
// abaixo do limite, oscilação — ver utils/networkStatus.js e
// services/monitoramento/measurementsService.js). Só mostra o que foi
// registrado de verdade: sem alerta gerado, sem linha aqui.
//
// DAR BAIXA MANUAL: cada alerta aberto tem um botão "Resolver". Antes só
// existia o caminho automático — o alerta ficava aberto até o próprio sistema
// medir a normalização —, então algo já tratado na mão (cabo trocado, serviço
// reiniciado) continuava pesando na lista sem ninguém poder encerrar.
//
// resolveAlertsOfType() encerra por (ponto, tipo) e não por id, o que soa
// abrangente demais pra um botão de linha. Não é: openAlertIfNew() só abre
// alerta se não houver outro do mesmo tipo ABERTO pro mesmo ponto, então
// existe no máximo um aberto por par — a chamada atinge exatamente esta linha.
//
// Sem confirmação de propósito: é um reconhecimento, não uma exclusão. A
// linha continua na lista, esmaecida e marcada como normalizada, e o
// histórico no banco guarda o resolved_at.
export default function AlertsPanel({ alerts, monitorNameByUid }) {
  const resolveAlert = useResolveAlert()
  const { showToast } = useToast()
  const [resolvendoId, setResolvendoId] = useState(null)

  async function resolver(alerta) {
    setResolvendoId(alerta.id)
    try {
      await resolveAlert(alerta.monitorUid, alerta.tipo)
    } catch (e) {
      showToast(e.message || 'Não foi possível resolver o alerta.', 'danger')
    } finally {
      setResolvendoId(null)
    }
  }

  if (!alerts.length) {
    return <EmptyHint>Nenhum alerta registrado — tudo dentro dos limites configurados.</EmptyHint>
  }

  return (
    <div className={styles.list}>
      {alerts.map((a) => {
        const nome = monitorNameByUid[a.monitorUid] || 'Ponto removido'
        const resolvendo = resolvendoId === a.id

        return (
          <div key={a.id} className={`${styles.row} ${a.resolvido ? styles.resolved : ''}`}>
            <Badge variant={a.severidade === 'problema' ? 'danger' : 'warn'}>
              {a.severidade === 'problema' ? 'Problema' : 'Atenção'}
            </Badge>
            <div className={styles.content}>
              <b>{nome}</b>
              <span>
                {a.mensagem}
                {a.resolvido ? ' — normalizado' : ''}
              </span>
            </div>
            {!a.resolvido && (
              <Button
                variant="ghost"
                size="sm"
                className={styles.resolveBtn}
                onClick={() => resolver(a)}
                disabled={resolvendo}
                // O nome do ponto entra no rótulo acessível: sem ele, um
                // leitor de tela anuncia uma fileira de "Resolver" idênticos
                // sem dizer a qual alerta cada um pertence.
                aria-label={`Resolver alerta de ${nome}`}
              >
                <CheckIcon width={14} height={14} />
                {resolvendo ? 'Resolvendo...' : 'Resolver'}
              </Button>
            )}
            <span className={styles.time}>{fmtRelTime(a.createdAt)}</span>
          </div>
        )
      })}
    </div>
  )
}
