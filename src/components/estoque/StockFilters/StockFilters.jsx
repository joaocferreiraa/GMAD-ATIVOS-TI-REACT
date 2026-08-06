import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import Button from '../../ui/Button/Button'
import { STOCK_STATUS_OPTIONS } from '../../../constants/stock'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  ...STOCK_STATUS_OPTIONS.map((s) => ({ value: s, label: s })),
]

// Barra de filtros da tela de Estoque (.toolbar do sistema original) — só
// busca e status; "Limpar filtros" não reseta a aba de Tipo, igual ao
// original (stockBtnClear só limpa search+status).
export default function StockFilters({ filters, onChange, onClear }) {
  return (
    <Toolbar>
      <SearchInput
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar por item, marca/modelo, observações..."
      />
      <Select
        context="toolbar"
        value={filters.status}
        onChange={(v) => onChange({ status: v })}
        options={STATUS_OPTIONS}
        aria-label="Status"
      />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar filtros
      </Button>
    </Toolbar>
  )
}
