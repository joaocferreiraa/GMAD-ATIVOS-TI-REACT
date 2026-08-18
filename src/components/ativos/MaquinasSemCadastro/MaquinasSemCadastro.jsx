import { useState } from 'react'
import Button from '../../ui/Button/Button'
import Badge from '../../ui/Badge/Badge'
import { fmtBytes } from '../../../utils/hostFormatters'
import { fmtRelTime } from '../../../utils/formatters'
import { linkRustDesk, statusAcessoRemoto } from '../../../utils/acessoRemoto'
import styles from './MaquinasSemCadastro.module.css'

// Máquinas que o agente detectou na rede mas que NÃO têm ficha em Ativos —
// PC que entrou no parque sem passar pelo cadastro.
//
// Fica no TOPO da tela de Ativos, não numa aba separada: é a informação
// mais acionável que o agente produz ("tem máquina rodando que o TI não
// controla") e some sozinha quando não há nenhuma. Numa aba, seria preciso
// lembrar de ir olhar.
//
// Começa recolhido para não empurrar a lista de ativos para baixo todo dia:
// o contador no cabeçalho já diz o que precisa ser dito.
export default function MaquinasSemCadastro({ maquinas, onCadastrar }) {
  const [aberto, setAberto] = useState(false)

  if (!maquinas?.length) return null

  return (
    <div className={styles.caixa}>
      <button
        type="button"
        className={styles.cabecalho}
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
      >
        <Badge variant="warn">{maquinas.length}</Badge>
        <span className={styles.titulo}>
          {maquinas.length === 1
            ? 'máquina detectada na rede sem ficha cadastrada'
            : 'máquinas detectadas na rede sem ficha cadastrada'}
        </span>
        <span className={styles.seta} aria-hidden="true">
          {aberto ? '▲' : '▼'}
        </span>
      </button>

      {aberto ? (
        <div className={styles.lista}>
          {maquinas.map((m) => {
            const acesso = statusAcessoRemoto(m)
            return (
              <div key={m.machineUid} className={styles.linha}>
                <div className={styles.identificacao}>
                  <strong>{m.hostname}</strong>
                  {m.usuarioLogado ? <span className={styles.sub}>{m.usuarioLogado}</span> : null}
                </div>
                <div className={styles.specs}>
                  {[
                    [m.fabricante, m.modelo].filter(Boolean).join(' '),
                    m.cpuModelo,
                    fmtBytes(m.ramTotalBytes),
                  ]
                    .filter((v) => v && v !== '—')
                    .join(' · ')}
                </div>
                <div className={styles.visto}>visto {fmtRelTime(m.coletadoEm)}</div>
                <div className={styles.acoes}>
                  {acesso.estado === 'pronto' ? (
                    <Button size="sm" as="a" href={linkRustDesk(m.rustdeskId)}>
                      Acessar
                    </Button>
                  ) : null}
                  <Button variant="primary" size="sm" onClick={() => onCadastrar(m)}>
                    Cadastrar
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
