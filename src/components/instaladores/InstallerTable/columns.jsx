import Badge from '../../ui/Badge/Badge'
import tableStyles from '../../ui/Table/Table.module.css'
import { fmtDate } from '../../../utils/formatters'
import { installerRecent } from '../../../utils/installerFilter'
import InstallerAvatar from '../InstallerAvatar/InstallerAvatar'
import cellStyles from './InstallerTable.module.css'

// Colunas da tabela de Instaladores, portadas 1:1 do renderInstaladorTable()
// do sistema original. Nenhuma coluna é ordenável aqui — a ordenação é feita
// pelo seletor "Ordenar por" da barra de filtros, igual ao original.
export const COLUMNS = [
  {
    key: 'nome',
    label: 'Programa',
    render: (i) => (
      <div className={cellStyles.nameCell}>
        <InstallerAvatar nome={i.nome} />
        <div className={tableStyles.cellStack}>
          <b>{i.nome}</b>
          <span>{i.categoria}</span>
        </div>
      </div>
    ),
  },
  {
    key: 'versao',
    label: 'Versão',
    render: (i) => <span className={cellStyles.mono}>{i.versao || '—'}</span>,
  },
  { key: 'arquitetura', label: 'Arquitetura', render: (i) => i.arquitetura || '—' },
  { key: 'tamanho', label: 'Tamanho', render: (i) => i.tamanho || '—' },
  { key: 'desenvolvedor', label: 'Desenvolvedor', render: (i) => i.desenvolvedor || '—' },
  {
    key: 'dataAtualizacao',
    label: 'Atualizado',
    render: (i) => (
      <span className={cellStyles.badgeGroup}>
        {i.dataAtualizacao ? fmtDate(i.dataAtualizacao) : '—'}
        {installerRecent(i.dataAtualizacao) && <Badge variant="ok">Recente</Badge>}
      </span>
    ),
  },
]
