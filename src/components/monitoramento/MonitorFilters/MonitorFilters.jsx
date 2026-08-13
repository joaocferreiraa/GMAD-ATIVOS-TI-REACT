import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import Button from '../../ui/Button/Button'
import { unitDisplayName } from '../../../utils/formatters'
import { MONITOR_TIPOS } from '../../../constants/monitoramento'

const TIPO_OPTIONS = [
  { value: 'Todos', label: 'Todos os tipos' },
  ...MONITOR_TIPOS.map((t) => ({ value: t, label: t })),
]

// Barra de filtros da tela de Monitoramento de Rede (mesmo padrão de
// StockFilters/AssetFilters).
export default function MonitorFilters({ filters, unidades, onChange, onClear }) {
  const unidadeOptions = [
    { value: 'Todas', label: 'Todas as unidades' },
    ...unidades.map((u) => ({ value: u, label: unitDisplayName(u) })),
  ]

  return (
    <Toolbar>
      <SearchInput
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar por nome, IP/host, descrição..."
      />
      <Select
        context="toolbar"
        value={filters.unidade}
        onChange={(v) => onChange({ unidade: v })}
        options={unidadeOptions}
        aria-label="Unidade"
      />
      <Select
        context="toolbar"
        value={filters.tipo}
        onChange={(v) => onChange({ tipo: v })}
        options={TIPO_OPTIONS}
        aria-label="Tipo"
      />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar filtros
      </Button>
    </Toolbar>
  )
}
