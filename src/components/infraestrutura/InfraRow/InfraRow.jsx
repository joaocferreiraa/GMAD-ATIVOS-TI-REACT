import { useState } from 'react'
import { useToast } from '../../../hooks/useToast'
import { CopyIcon, EyeIcon, EyeOffIcon } from '../../ui/Icon/icons'
import styles from './InfraRow.module.css'

// Linha de campo da tela de Infraestrutura (infraRowHtml() do sistema
// original) — mostra o valor (ou "Não informado"), com botão de copiar e,
// para campos `masked` (senha), um botão de mostrar/ocultar.
export default function InfraRow({ label, value, masked }) {
  const { showToast } = useToast()
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  const hasValue = value !== undefined && value !== null && String(value).trim() !== ''

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      showToast('Copiado.')
      setTimeout(() => setCopied(false), 1200)
    } catch {
      showToast('Não foi possível copiar.', 'danger')
    }
  }

  let displayValue = 'Não informado'
  if (hasValue) displayValue = masked ? (visible ? value : '••••••••') : value

  return (
    <div className={styles.row}>
      <div className={styles.label}>{label}</div>
      <div className={styles.value}>{displayValue}</div>
      <div className={styles.actions}>
        {masked && hasValue && (
          <button
            type="button"
            className={styles.copyBtn}
            onClick={() => setVisible((v) => !v)}
            title="Mostrar/ocultar senha"
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
        {hasValue && (
          <button
            type="button"
            className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
            title="Copiar"
          >
            <CopyIcon />
          </button>
        )}
      </div>
    </div>
  )
}
