import Badge from '../../ui/Badge/Badge'
import tableStyles from '../../ui/Table/Table.module.css'
import { unitDisplayName } from '../../../utils/formatters'
import { stockStatusVariant } from '../../../utils/statusBadge'

// Colunas da tabela de Estoque, portadas 1:1 do renderStockTable() do
// sistema original. Ao contrário de Ativos/Contatos, nenhuma coluna é
// ordenável (a tabela original não tem cabeçalhos clicáveis aqui).
export const COLUMNS = [
  {
    key: 'tipo',
    label: 'Tipo',
    render: (i) => <span className={tableStyles.muted}>{i.tipo}</span>,
  },
  { key: 'item', label: 'Item', render: (i) => i.item },
  { key: 'marcaModelo', label: 'Marca / Modelo', render: (i) => i.marcaModelo || '—' },
  {
    key: 'quantidade',
    label: 'Qtd.',
    render: (i) => <span className={tableStyles.mono}>{i.quantidade || '0'}</span>,
  },
  { key: 'unidade', label: 'Unidade', render: (i) => unitDisplayName(i.unidade) || '—' },
  {
    key: 'status',
    label: 'Status',
    render: (i) => <Badge variant={stockStatusVariant(i.status)}>{i.status || 'Disponível'}</Badge>,
  },
]
