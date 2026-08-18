import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import EmptyState from '../../ui/EmptyState/EmptyState'
import { GRAVIDADE_ROTULO, gravidadeTone } from '../../../utils/saudeParque'
import styles from './SaudeParque.module.css'

// "O que precisa de atenção agora?" — o inventário lido como lista de
// trabalho, não como relatório.
//
// A diferença para um relatório comum: cada linha traz o PRÓXIMO PASSO, não
// só o dado. Um alerta sem ação vira ruído que se aprende a ignorar, e um
// parque inteiro listado com "uso de disco: 62%" obriga alguém a varrer e
// decidir — que é justamente o trabalho que esta tela existe para poupar.
export default function SaudeParque({ diagnostico, onAbrirMaquina }) {
  const { achados, porGravidade, saudaveis, total } = diagnostico

  if (!total) {
    return (
      <EmptyState title="Nenhuma máquina inventariada">
        Instale o agente nas máquinas do parque para ver o diagnóstico aqui.
      </EmptyState>
    )
  }

  if (!achados.length) {
    return (
      <EmptyState title="Nada precisa de atenção">
        As {total} máquinas do parque estão sem disco cheio, sem falha de hardware reportada e
        reportando normalmente.
      </EmptyState>
    )
  }

  return (
    <div>
      <div className={styles.resumo}>
        {porGravidade.critico > 0 && (
          <span className={styles.resumoItem}>
            <Badge variant="danger">{porGravidade.critico}</Badge> crítico
            {porGravidade.critico > 1 ? 's' : ''}
          </span>
        )}
        {porGravidade.atencao > 0 && (
          <span className={styles.resumoItem}>
            <Badge variant="warn">{porGravidade.atencao}</Badge> em atenção
          </span>
        )}
        {porGravidade.oportunidade > 0 && (
          <span className={styles.resumoItem}>
            <Badge variant="muted">{porGravidade.oportunidade}</Badge> oportunidade
            {porGravidade.oportunidade > 1 ? 's' : ''}
          </span>
        )}
        {/* O contador de máquinas sem achado impede a tela de parecer que o
            parque inteiro está pegando fogo quando são 2 problemas em 60. */}
        <span className={styles.saudaveis}>
          {saudaveis} de {total} sem nenhum achado
        </span>
      </div>

      <ul className={styles.lista}>
        {achados.map((a) => (
          <li key={`${a.machineUid}-${a.tipo}`} className={styles.item}>
            <span className={`${styles.marcador} ${styles[a.gravidade]}`} aria-hidden="true" />
            <div className={styles.conteudo}>
              <div className={styles.linhaTitulo}>
                <strong>{a.titulo}</strong>
                <Badge variant={gravidadeTone(a.gravidade)}>{GRAVIDADE_ROTULO[a.gravidade]}</Badge>
              </div>
              <div className={styles.detalhe}>{a.detalhe}</div>
              {/* A ação é o que transforma o achado em trabalho possível. */}
              <div className={styles.acao}>{a.acao}</div>
            </div>
            <div className={styles.maquina}>
              <Button size="sm" onClick={() => onAbrirMaquina(a.machineUid)}>
                {a.hostname}
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
