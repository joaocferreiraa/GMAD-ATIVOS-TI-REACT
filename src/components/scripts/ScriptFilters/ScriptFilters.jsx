import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import Button from '../../ui/Button/Button'
import { StarIcon } from '../../ui/Icon/icons'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { SCRIPT_SORT_OPTIONS } from '../../../constants/scripts'

// Barra de filtros da tela de Scripts (.toolbar do sistema original).
export default function ScriptFilters({ filters, onChange, onClear }) {
  const bindTooltip = useHoverTooltip()
  return (
    <Toolbar>
      <SearchInput
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar por nome, categoria, descrição, autor..."
      />
      <Select
        context="toolbar"
        value={filters.sort}
        onChange={(v) => onChange({ sort: v })}
        options={SCRIPT_SORT_OPTIONS}
        aria-label="Ordenar"
      />
      <Button
        variant={filters.onlyFavorites ? 'primary' : 'ghost'}
        size="sm"
        onClick={() => onChange({ onlyFavorites: !filters.onlyFavorites })}
        {...bindTooltip('Mostrar somente favoritos')}
      >
        <StarIcon /> Favoritos
      </Button>
      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar filtros
      </Button>
    </Toolbar>
  )
}
