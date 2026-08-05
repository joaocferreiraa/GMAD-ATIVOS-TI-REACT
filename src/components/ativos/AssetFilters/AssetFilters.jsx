import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import Button from '../../ui/Button/Button'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'Ativo', label: 'Ativo' },
  { value: 'Manutenção', label: 'Manutenção' },
  { value: 'Inativo', label: 'Inativo' },
]

const ETIQUETA_OPTIONS = [
  { value: '', label: 'Etiqueta: todos' },
  { value: 'Possui', label: 'Possui etiqueta' },
  { value: 'Sem', label: 'Sem etiqueta' },
]

const GARANTIA_OPTIONS = [
  { value: '', label: 'Garantia: todas' },
  { value: 'expired', label: 'Vencida' },
  { value: 'warn', label: 'Vencendo (60 dias)' },
  { value: 'ok', label: 'Válida' },
  { value: 'none', label: 'Sem data' },
]

// Barra de filtros da tela de Ativos (.toolbar do sistema original).
export default function AssetFilters({ filters, departamentos, usuarios, onChange, onClear }) {
  const deptOptions = [
    { value: '', label: 'Todos os departamentos' },
    ...departamentos.map((d) => ({ value: d, label: d })),
  ]
  const usuarioOptions = [
    { value: '', label: 'Todos os usuários' },
    ...usuarios.map((u) => ({ value: u, label: u })),
  ]

  return (
    <Toolbar>
      <SearchInput
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar por ativo, usuário, modelo, série, IMEI..."
      />
      <Select
        context="toolbar"
        value={filters.status}
        onChange={(v) => onChange({ status: v })}
        options={STATUS_OPTIONS}
        aria-label="Status"
      />
      <Select
        context="toolbar"
        value={filters.dept}
        onChange={(v) => onChange({ dept: v })}
        options={deptOptions}
        aria-label="Departamento"
      />
      <Select
        context="toolbar"
        value={filters.etiqueta}
        onChange={(v) => onChange({ etiqueta: v })}
        options={ETIQUETA_OPTIONS}
        aria-label="Etiqueta"
      />
      <Select
        context="toolbar"
        value={filters.garantia}
        onChange={(v) => onChange({ garantia: v })}
        options={GARANTIA_OPTIONS}
        aria-label="Garantia"
      />
      <Select
        context="toolbar"
        value={filters.usuario}
        onChange={(v) => onChange({ usuario: v })}
        options={usuarioOptions}
        aria-label="Usuário"
      />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar filtros
      </Button>
    </Toolbar>
  )
}
