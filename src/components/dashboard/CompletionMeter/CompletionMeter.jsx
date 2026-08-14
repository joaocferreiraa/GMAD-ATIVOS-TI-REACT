import EmptyHint from '../EmptyHint/EmptyHint'
import styles from './CompletionMeter.module.css'

// Indicador de completude de cadastro de um campo — em vez de tentar montar
// uma distribuição (por faixa, categoria etc.) quando a maior parte dos
// registros ainda não tem o campo preenchido, mostra o problema real de
// frente: quantos já têm o dado e quantos ainda faltam, com uma barra de
// progresso. Pensado pra crescer sozinho conforme a equipe for preenchendo
// o campo em Ativos — sem exigir nenhuma mudança aqui.
export default function CompletionMeter({
  label,
  filled,
  total,
  missingLabel = 'ainda sem esse dado',
  emptyMessage = 'Sem dados suficientes.',
}) {
  if (!total) return <EmptyHint>{emptyMessage}</EmptyHint>

  const pct = Math.round((filled / total) * 100)
  const missing = total - filled

  return (
    <div className={styles.wrap}>
      <div className={styles.headline}>
        <span className={styles.pct}>{pct}%</span>
        <span className={styles.headlineLabel}>{label}</span>
      </div>
      <div className={styles.track}>
        <div className={styles.fill} style={{ width: `${pct}%` }} />
      </div>
      <div className={styles.footer}>
        <span>
          <strong>{filled}</strong> de <strong>{total}</strong> ativos
        </span>
        {missing > 0 && (
          <span className={styles.missing}>
            {missing} {missingLabel}
          </span>
        )}
      </div>
    </div>
  )
}
