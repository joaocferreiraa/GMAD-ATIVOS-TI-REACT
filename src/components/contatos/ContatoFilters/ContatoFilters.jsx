import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import Button from '../../ui/Button/Button'
import { unitDisplayName } from '../../../utils/formatters'

const GESTOR_OPTIONS = [
  { value: '', label: 'Gestor: todos' },
  { value: 'sim', label: 'Só gestores' },
  { value: 'nao', label: 'Só não gestores' },
]

const CELULAR_OPTIONS = [
  { value: '', label: 'Celular corporativo: todos' },
  { value: 'sim', label: 'Possui celular' },
  { value: 'nao', label: 'Sem celular' },
]

const TELEFONE_OPTIONS = [
  { value: '', label: 'Telefone: todos' },
  { value: 'sim', label: 'Possui telefone' },
  { value: 'nao', label: 'Sem telefone' },
]

// Barra de filtros da tela de Contatos (.toolbar do sistema original).
export default function ContatoFilters({ filters, unidades, departamentos, onChange, onClear }) {
  const unidadeOptions = [
    { value: '', label: 'Todas as unidades' },
    ...unidades.map((u) => ({ value: u, label: unitDisplayName(u) })),
  ]
  const deptOptions = [
    { value: '', label: 'Todos os departamentos' },
    ...departamentos.map((d) => ({ value: d, label: d })),
  ]

  return (
    <Toolbar>
      <SearchInput
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar por nome, unidade, departamento, telefone, e-mail, celular..."
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
        value={filters.departamento}
        onChange={(v) => onChange({ departamento: v })}
        options={deptOptions}
        aria-label="Departamento"
      />
      <Select
        context="toolbar"
        value={filters.gestor}
        onChange={(v) => onChange({ gestor: v })}
        options={GESTOR_OPTIONS}
        aria-label="Gestor"
      />
      <Select
        context="toolbar"
        value={filters.possuiCelular}
        onChange={(v) => onChange({ possuiCelular: v })}
        options={CELULAR_OPTIONS}
        aria-label="Celular corporativo"
      />
      <Select
        context="toolbar"
        value={filters.possuiTelefone}
        onChange={(v) => onChange({ possuiTelefone: v })}
        options={TELEFONE_OPTIONS}
        aria-label="Telefone"
      />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar filtros
      </Button>
    </Toolbar>
  )
}
