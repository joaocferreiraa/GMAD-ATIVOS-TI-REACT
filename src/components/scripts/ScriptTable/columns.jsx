import Badge from '../../ui/Badge/Badge'
import TagChip from '../../ui/TagChip/TagChip'
import tableStyles from '../../ui/Table/Table.module.css'
import { fmtDate } from '../../../utils/formatters'
import { scriptNew } from '../../../utils/scriptFilter'
import cellStyles from './ScriptTable.module.css'

// Colunas da tabela de Scripts, portadas 1:1 do renderScriptTable() do
// sistema original. Nenhuma coluna é ordenável aqui — a ordenação é feita
// pelo seletor "Ordenar por" da barra de filtros, igual ao original.
export const COLUMNS = [
  {
    key: 'nome',
    label: 'Script',
    render: (s) => (
      <div className={cellStyles.nameCell}>
        <TagChip>.{(s.extensao || s.tipo || '').replace(/^\./, '')}</TagChip>
        <div className={tableStyles.cellStack}>
          <b>
            {s.nome} {scriptNew(s.dataCriacao) && <Badge variant="ok">Novo</Badge>}
          </b>
          <span>
            {s.categoria}
            {s.descricao ? ` · ${s.descricao}` : ''}
          </span>
        </div>
      </div>
    ),
  },
  {
    key: 'versao',
    label: 'Versão',
    render: (s) => <span className={cellStyles.mono}>{s.versao || '—'}</span>,
  },
  { key: 'autor', label: 'Autor', render: (s) => s.autor || '—' },
  {
    key: 'dataAtualizacao',
    label: 'Atualizado',
    render: (s) => (s.dataAtualizacao ? fmtDate(s.dataAtualizacao) : '—'),
  },
  {
    key: 'downloads',
    label: 'Downloads',
    render: (s) => <span className={cellStyles.mono}>{s.downloads || 0}</span>,
  },
]
