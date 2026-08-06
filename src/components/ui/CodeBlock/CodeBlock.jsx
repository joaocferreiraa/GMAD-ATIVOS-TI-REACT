import { highlightScriptCode } from '../../../utils/scriptHighlight'
import styles from './CodeBlock.module.css'

// Bloco de código com highlighting leve (.code-block do sistema original) —
// usado pelo drawer de detalhes de Scripts. `tipo` seleciona os prefixos de
// comentário/palavras-chave (BAT/CMD/PS1/REG/VBS); tipos sem highlighter
// configurado (ZIP/Outro) caem para texto simples (já escapado).
export default function CodeBlock({ code, tipo }) {
  return (
    <pre
      className={styles.codeBlock}
      dangerouslySetInnerHTML={{ __html: highlightScriptCode(code, tipo) }}
    />
  )
}
