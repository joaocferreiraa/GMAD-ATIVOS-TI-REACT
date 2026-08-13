import { useState } from 'react'
import Badge from '../../ui/Badge/Badge'
import EmptyHint from '../../dashboard/EmptyHint/EmptyHint'
import RealtimeChart from '../RealtimeChart/RealtimeChart'
import { useMonitorHistory } from '../../../hooks/data/useMedicoes'
import { HISTORICO_PERIODOS } from '../../../constants/monitoramento'
import { STATUS_LABEL, statusBadgeVariant } from '../../../utils/networkStatus'
import styles from './LiveChartCard.module.css'

// Gráfico em tempo real na tela principal do Monitoramento de Rede — abrir
// a aba já mostra a evolução da conexão, sem precisar entrar na ficha de
// um ponto (ver useMonitorHistory: assina Realtime, atualiza sozinho
// quando uma medição nova chega). Com mais de um ponto cadastrado, as
// pastilhas em cima trocam qual ponto o gráfico mostra.
export default function LiveChartCard({ monitors }) {
  const [selectedUid, setSelectedUid] = useState(null)
  const [periodoValue, setPeriodoValue] = useState('30m')
  const [metric, setMetric] = useState('latenciaMs')

  // Hooks sempre chamados na mesma ordem (regra do React) mesmo sem nenhum
  // ponto cadastrado ainda — useMonitorHistory já lida com uid undefined
  // (enabled: !!monitorUid, ver hooks/data/useMedicoes.js).
  const selected = monitors.find((m) => m.uid === selectedUid) ?? monitors[0]
  const periodo = HISTORICO_PERIODOS.find((p) => p.value === periodoValue) ?? HISTORICO_PERIODOS[1]
  const { data: measurements, isLoading } = useMonitorHistory(selected?.uid, periodo.minutes)

  if (!monitors.length) {
    return (
      <EmptyHint>
        Cadastre um ponto monitorado para ver o gráfico em tempo real da conexão.
      </EmptyHint>
    )
  }

  return (
    <div>
      {monitors.length > 1 && (
        <div className={styles.pillRow}>
          {monitors.map((m) => (
            <button
              key={m.uid}
              type="button"
              className={`${styles.pill} ${m.uid === selected.uid ? styles.pillActive : ''}`}
              onClick={() => setSelectedUid(m.uid)}
            >
              {m.nome}
              <Badge variant={statusBadgeVariant(m.statusInfo?.status)}>
                {STATUS_LABEL[m.statusInfo?.status ?? 'sem-dados']}
              </Badge>
            </button>
          ))}
        </div>
      )}
      <RealtimeChart
        title={selected.nome}
        measurements={measurements}
        metric={metric}
        onMetricChange={setMetric}
        periodo={periodoValue}
        onPeriodoChange={setPeriodoValue}
        isLoading={isLoading}
      />
    </div>
  )
}
