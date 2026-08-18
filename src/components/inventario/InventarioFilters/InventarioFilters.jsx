import Toolbar from '../../ui/Toolbar/Toolbar'
import SearchInput from '../../ui/SearchInput/SearchInput'
import Select from '../../ui/Select/Select'
import Button from '../../ui/Button/Button'

// Barra de filtros do Inventário. As opções de fabricante e SO são
// DERIVADAS do que foi coletado (não uma lista fixa em constants/): quem
// dita quais fabricantes existem é o parque real, e uma lista fixa
// envelheceria a cada compra de máquina nova.
export default function InventarioFilters({ filters, onChange, onClear, opcoes }) {
  return (
    <Toolbar>
      <SearchInput
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar por máquina, usuário, série, IP, ID do RustDesk..."
      />
      <Select
        context="toolbar"
        value={filters.tipoChassi}
        onChange={(v) => onChange({ tipoChassi: v })}
        options={[{ value: '', label: 'Todos os tipos' }, ...opcoes.tipos]}
        aria-label="Tipo de máquina"
      />
      <Select
        context="toolbar"
        value={filters.fabricante}
        onChange={(v) => onChange({ fabricante: v })}
        options={[{ value: '', label: 'Todos os fabricantes' }, ...opcoes.fabricantes]}
        aria-label="Fabricante"
      />
      <Select
        context="toolbar"
        value={filters.so}
        onChange={(v) => onChange({ so: v })}
        options={[{ value: '', label: 'Todos os sistemas' }, ...opcoes.sistemas]}
        aria-label="Sistema operacional"
      />
      <Select
        context="toolbar"
        value={filters.situacao}
        onChange={(v) => onChange({ situacao: v })}
        options={[
          { value: '', label: 'Todas as situações' },
          { value: 'atual', label: 'Reportando' },
          { value: 'desatualizada', label: 'Sem reportar há 7+ dias' },
        ]}
        aria-label="Situação da coleta"
      />
      <Select
        context="toolbar"
        value={filters.acessoRemoto}
        onChange={(v) => onChange({ acessoRemoto: v })}
        options={[
          { value: '', label: 'Acesso remoto: todos' },
          { value: 'pronto', label: 'Pronto para acesso' },
          { value: 'pendente', label: 'Sem acesso remoto' },
        ]}
        aria-label="Acesso remoto"
      />
      <Button variant="ghost" size="sm" onClick={onClear}>
        Limpar filtros
      </Button>
    </Toolbar>
  )
}
