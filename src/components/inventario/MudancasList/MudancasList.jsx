import Badge from '../../ui/Badge/Badge'
import EmptyState from '../../ui/EmptyState/EmptyState'
import { fmtRelTime } from '../../../utils/formatters'
import { descreverMudanca, severidadeTone, ROTULO_TIPO } from '../../../utils/inventarioMudancas'
import styles from './MudancasList.module.css'

// Linha do tempo das mudanças detectadas pelo agente. Usada em dois
// contextos: o parque inteiro (tela de máquinas) e uma máquina só (dentro
// da ficha) — daí `mostrarMaquina`, que esconde o nome quando ele já é o
// título da tela em volta.
export default function MudancasList({ mudancas, mostrarMaquina = true, vazioMensagem }) {
  if (!mudancas?.length) {
    return (
      <EmptyState title="Nenhuma mudança registrada">
        {vazioMensagem ??
          'Quando o agente detectar troca de peça, programa instalado ou máquina mudando de dono, o histórico aparece aqui.'}
      </EmptyState>
    )
  }

  return (
    <ul className={styles.lista}>
      {mudancas.map((m) => (
        <li key={m.id} className={styles.item}>
          {/* Marcador colorido por severidade: dá para varrer a lista e
              achar o que pede ação sem ler cada linha. */}
          <span className={`${styles.marcador} ${styles[m.severidade] ?? ''}`} aria-hidden="true" />
          <div className={styles.conteudo}>
            <div className={styles.descricao}>{descreverMudanca(m)}</div>
            <div className={styles.meta}>
              {mostrarMaquina ? <strong>{m.hostname}</strong> : null}
              <Badge variant={severidadeTone(m.severidade)}>{ROTULO_TIPO[m.tipo] ?? m.tipo}</Badge>
              <span>{fmtRelTime(m.createdAt)}</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
