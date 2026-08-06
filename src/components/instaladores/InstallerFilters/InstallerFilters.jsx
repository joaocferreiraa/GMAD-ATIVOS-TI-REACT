import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import Button from '../../ui/Button/Button'
import { INSTALLER_SORT_OPTIONS } from '../../../constants/installers'

// Barra de filtros da tela de Instaladores (.toolbar do sistema original).
export default function InstallerFilters({ filters, onChange, onClear }) {
  return (
    <Toolbar>
      <SearchInput
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar por nome, categoria, desenvolvedor..."
      />
      <Select
        context="toolbar"
        value={filters.sort}
        onChange={(v) => onChange({ sort: v })}
        options={INSTALLER_SORT_OPTIONS}
        aria-label="Ordenar"
      />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar filtros
      </Button>
    </Toolbar>
  )
}
