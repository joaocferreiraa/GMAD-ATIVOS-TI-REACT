import { useState } from 'react'
import { useToast } from '../../../hooks/useToast'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { CopyIcon, EyeIcon, EyeOffIcon } from '../../ui/Icon/icons'
import styles from './InfraRow.module.css'

// Linha de campo da tela de Infraestrutura (infraRowHtml() do sistema
// original) — mostra o valor (ou "Não informado"), com botão de copiar e,
// para campos `masked` (senha), um botão de mostrar/ocultar.
export default function InfraRow({ label, value, masked }) {
  const { showToast } = useToast()
  const bindTooltip = useHoverTooltip()
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)

  // O original reconstrói o HTML do zero a cada mudança de estado, então a
  // senha sempre volta a ficar mascarada (ex.: ao trocar de rede Wi-Fi na
  // mesma unidade). Replica isso reescondendo sempre que o valor mudar —
  // ajustado durante o render (não em efeito), como recomendado pelo React
  // para resetar estado quando uma prop muda.
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setVisible(false)
  }

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
            /* bindTooltip só dá o tooltip visual (mouse/foco) — não nomeia o
               botão pra leitor de tela. Sem o aria-label, este botão e o de
               copiar eram anunciados só como "button", sem dizer que um
               revela e o outro copia uma senha. Mesmo par aria-label +
               tooltip usado no resto do site (ver RowActions e o olho de
               senha da LoginPage, que também alterna o texto pelo estado). */
            aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
            {...bindTooltip(visible ? 'Ocultar senha' : 'Mostrar senha')}
          >
            {visible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        )}
        {hasValue && (
          <button
            type="button"
            className={`${styles.copyBtn} ${copied ? styles.copied : ''}`}
            onClick={handleCopy}
            aria-label={`Copiar ${label}`}
            {...bindTooltip('Copiar')}
          >
            <CopyIcon />
          </button>
        )}
      </div>
    </div>
  )
}
