import Badge from '../../ui/Badge/Badge'
import TagChip from '../../ui/TagChip/TagChip'
import tableStyles from '../../ui/Table/Table.module.css'
import AcessoRemotoCell from './AcessoRemotoCell'
import { fmtBytes } from '../../../utils/hostFormatters'
import { fmtRelTime } from '../../../utils/formatters'
import { isDesatualizada } from '../../../utils/inventarioFilter'

// Colunas da tabela de Inventário. Mostram o que identifica a máquina e o
// que decide troca/upgrade — o detalhe completo (pentes de RAM, softwares,
// adaptadores) fica na ficha, que abre no clique da linha.
export const COLUMNS = [
  {
    key: 'hostname',
    label: 'Máquina',
    // Mesmo TagChip que a tabela de Ativos usa na coluna "Ativo": neste
    // parque o hostname É o ID do ativo (ver inventarioMatch.js), então as
    // duas telas mostram o mesmo identificador — não faz sentido uma
    // apresentá-lo como chip e a outra como texto solto.
    render: (m) => (
      <div>
        <TagChip>{m.hostname}</TagChip>
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
            que já tem?" — a pergunta que essa coluna existe pra responder.
            Quando o agente reporta o total mas não quantos estão ocupados
            (acontece em placa de servidor), mostra só o total: "x/4 slots"
            com o numerador vazio sai como "/4 slots" e parece defeito. */}
        {m.ramSlotsTotais ? (
          <div className={tableStyles.muted}>
            {m.ramSlotsUsados ? `${m.ramSlotsUsados}/${m.ramSlotsTotais}` : m.ramSlotsTotais} slots
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
      // HDD em destaque, SSD em texto comum: a coluna existe pra responder
      // "ainda é HDD?", e a resposta é rara o bastante pra merecer cor —
      // fosse todo tipo de disco colorido, a cor não diria mais nada.
      const temHdd = tipos.some((t) => /hdd/i.test(t))
      return (
        <div>
          <span className={tableStyles.mono}>{fmtBytes(m.discoTotalBytes)}</span>
          {tipos.length ? (
            temHdd ? (
              <div>
                <Badge variant="warn">{tipos.join(' + ')}</Badge>
              </div>
            ) : (
              <div className={tableStyles.muted}>{tipos.join(' + ')}</div>
            )
          ) : null}
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
    render: (m) => <AcessoRemotoCell maquina={m} />,
  },
  {
    key: 'coletadoEm',
    label: 'Última coleta',
    render: (m) =>
      isDesatualizada(m) ? (
        // Badge (não texto solto) porque pede ação: máquina desligada há
        // uma semana, fora do parque, ou com o agente quebrado. Mesma
        // regra do HDD na coluna de armazenamento — badge só onde há o que
        // fazer, para a cor continuar significando alguma coisa.
        <Badge variant="warn">{fmtRelTime(m.coletadoEm)}</Badge>
      ) : (
        <span className={tableStyles.muted}>{fmtRelTime(m.coletadoEm)}</span>
      ),
  },
]
