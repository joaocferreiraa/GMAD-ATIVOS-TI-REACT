import { useState } from 'react'
import Button from '../../ui/Button/Button'
import { runSpeedTest } from '../../../utils/speedTest'
import { useInsertMeasurement } from '../../../hooks/data/useMedicoes'
import { useAuth } from '../../../hooks/auth/useAuth'
import styles from './SpeedTestPanel.module.css'

const STAGES = [
  { key: 'latencia', label: 'Latência' },
  { key: 'download', label: 'Download' },
  { key: 'upload', label: 'Upload' },
  { key: 'concluido', label: 'Finalizando' },
]

function MetricTile({ value, unidade, label }) {
  return (
    <div className={styles.metric}>
      <span className={styles.metricValue}>
        {value === null || value === undefined ? '—' : value}
        {value !== null && value !== undefined && (
          <span className={styles.metricUnit}>{unidade}</span>
        )}
      </span>
      <span className={styles.metricLabel}>{label}</span>
    </div>
  )
}

// Teste de velocidade real, rodado no navegador de quem está usando o
// painel (ver utils/speedTest.js) — mede contra /api/speedtest-* (Vercel
// Serverless Functions), nunca gera número simulado. O resultado é
// gravado como uma medição avulsa (sem ponto monitorado associado), pra
// entrar no histórico igual a qualquer outra.
export default function SpeedTestPanel({ unidade }) {
  const { user } = useAuth()
  const insertMeasurement = useInsertMeasurement()
  const [running, setRunning] = useState(false)
  const [stage, setStage] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  async function handleRun() {
    setRunning(true)
    setError(null)
    setResult(null)
    try {
      const measurement = await runSpeedTest({ onStage: setStage })
      setResult(measurement)
      await insertMeasurement({
        ...measurement,
        monitorUid: null,
        unidade: unidade && unidade !== 'Todas' ? unidade : null,
        executadoPor: user?.email || null,
      })
    } catch {
      setError('Não foi possível concluir o teste. Verifique sua conexão e tente novamente.')
    } finally {
      setRunning(false)
      setStage(null)
    }
  }

  const currentStageIndex = STAGES.findIndex((s) => s.key === stage)

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h3 className={styles.title}>Teste de velocidade</h3>
          <p className={styles.subtitle}>
            Mede a conexão deste navegador agora, contra a borda da Vercel (não um servidor de
            terceiros como um speedtest público) — download, upload, latência, jitter e packet loss
            reais.
          </p>
        </div>
        <Button variant="primary" onClick={handleRun} disabled={running}>
          {running ? 'Testando...' : 'Executar teste'}
        </Button>
      </div>

      {running && (
        <div className={styles.stages}>
          {STAGES.map((s, i) => (
            <span
              key={s.key}
              className={`${styles.stage} ${i === currentStageIndex ? styles.stageActive : ''} ${i < currentStageIndex ? styles.stageDone : ''}`}
            >
              {s.label}
            </span>
          ))}
        </div>
      )}

      {error && <p className={styles.error}>{error}</p>}

      {result && !running && (
        <div className={styles.results}>
          <MetricTile value={result.downloadMbps} unidade=" Mbps" label="Download" />
          <MetricTile value={result.uploadMbps} unidade=" Mbps" label="Upload" />
          <MetricTile value={result.latenciaMs} unidade=" ms" label="Latência" />
          <MetricTile value={result.jitterMs} unidade=" ms" label="Jitter" />
          <MetricTile value={result.packetLossPct} unidade="%" label="Packet Loss" />
        </div>
      )}
    </div>
  )
}
