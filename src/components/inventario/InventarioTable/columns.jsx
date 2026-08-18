import Badge from '../../ui/Badge/Badge'
import tableStyles from '../../ui/Table/Table.module.css'
import { fmtBytes } from '../../../utils/hostFormatters'
import { fmtRelTime } from '../../../utils/formatters'
import { isDesatualizada } from '../../../utils/inventarioFilter'
import { linkRustDesk, statusAcessoRemoto } from '../../../utils/acessoRemoto'

// Colunas da tabela de Inventário. Mostram o que identifica a máquina e o
// que decide troca/upgrade — o detalhe completo (pentes de RAM, softwares,
// adaptadores) fica na ficha, que abre no clique da linha.
export const COLUMNS = [
  {
    key: 'hostname',
    label: 'Máquina',
    render: (m) => (
      <div>
        <strong>{m.hostname}</strong>
        {m.usuarioLogado ? <div className={tableStyles.muted}>{m.usuarioLogado}</div> : null}
      </div>
    ),
  },
  {
    key: 'modelo',
    label: 'Fabricante / Modelo',
    render: (m) => (
      <div>
        {[m.fabricante, m.modelo].filter(Boolean).join(' ') || '—'}
        {m.numeroSerie ? (
          <div className={`${tableStyles.muted} ${tableStyles.mono}`}>{m.numeroSerie}</div>
        ) : null}
      </div>
    ),
  },
  {
    key: 'tipoChassi',
    label: 'Tipo',
    render: (m) => m.tipoChassi || '—',
  },
  {
    key: 'cpu',
    label: 'Processador',
    render: (m) => (
      <div>
        {m.cpuModelo || '—'}
        {m.cpuNucleos ? (
          <div className={tableStyles.muted}>
            {m.cpuNucleos} núcleos{m.cpuThreads ? ` / ${m.cpuThreads} threads` : ''}
          </div>
        ) : null}
      </div>
    ),
  },
  {
    key: 'ram',
    label: 'Memória',
    render: (m) => (
      <div>
        <span className={tableStyles.mono}>{fmtBytes(m.ramTotalBytes)}</span>
        {/* Slots livres é o que responde "dá pra fazer upgrade sem trocar o
            que já tem?" — a pergunta que essa coluna existe pra responder. */}
        {m.ramSlotsTotais ? (
          <div className={tableStyles.muted}>
            {m.ramSlotsUsados}/{m.ramSlotsTotais} slots
          </div>
        ) : null}
      </div>
    ),
  },
  {
    key: 'disco',
    label: 'Armazenamento',
    render: (m) => {
      // Tipo de mídia do primeiro disco: "ainda é HDD?" é o critério mais
      // usado pra priorizar troca de máquina.
      const tipos = [...new Set((m.discos ?? []).map((d) => d.tipoMidia).filter(Boolean))]
      return (
        <div>
          <span className={tableStyles.mono}>{fmtBytes(m.discoTotalBytes)}</span>
          {tipos.length ? <div className={tableStyles.muted}>{tipos.join(' + ')}</div> : null}
        </div>
      )
    },
  },
  {
    key: 'so',
    label: 'Sistema',
    render: (m) => (
      <div>
        {m.soNome || '—'}
        {m.soBuild ? <div className={tableStyles.muted}>build {m.soBuild}</div> : null}
      </div>
    ),
  },
  {
    key: 'acessoRemoto',
    label: 'Acesso remoto',
    render: (m) => {
      const acesso = statusAcessoRemoto(m)
      if (acesso.estado !== 'pronto') {
        return <span className={tableStyles.muted}>{acesso.rotulo}</span>
      }
      return (
        // stopPropagation: a linha inteira abre a ficha no clique; sem
        // isso, conectar abriria a sessão E a ficha por cima.
        <a
          href={linkRustDesk(m.rustdeskId)}
          onClick={(e) => e.stopPropagation()}
          title={`Conectar via RustDesk (ID ${m.rustdeskId})`}
        >
          Acessar
        </a>
      )
    },
  },
  {
    key: 'coletadoEm',
    label: 'Última coleta',
    render: (m) =>
      isDesatualizada(m) ? (
        // Badge (não texto solto) porque é o único estado da tabela que
        // pede ação: máquina desligada há uma semana, fora do parque, ou
        // com o agente quebrado.
        <Badge variant="warn">{fmtRelTime(m.coletadoEm)}</Badge>
      ) : (
        <span className={tableStyles.muted}>{fmtRelTime(m.coletadoEm)}</span>
      ),
  },
]
