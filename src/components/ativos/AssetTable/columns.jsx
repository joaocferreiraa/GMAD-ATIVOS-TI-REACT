import Badge from '../../ui/Badge/Badge'
import TagChip from '../../ui/TagChip/TagChip'
import tableStyles from '../../ui/Table/Table.module.css'
import { fmtMoney, unitDisplayName, warrantyInfo } from '../../../utils/formatters'
import { assetStatusVariant, warrantyVariant } from '../../../utils/statusBadge'

// Definições de coluna por categoria, portadas 1:1 do objeto COLUMNS do
// sistema original (render funcs retornam JSX em vez de strings HTML).
//
// Nota: no original, as células "Categoria", "Config.", "Preço", "Série",
// "IP" e "IMEI" envolvem o valor em <span class="muted">/<span class="mono">,
// mas o CSS só define `td.muted`/`td.mono` (aplicado à própria <td>, não a um
// <span> dentro dela) — ou seja, esse estilo nunca chega a ser aplicado.
// Replicado aqui exatamente como aparece hoje: texto simples, sem estilo.

function idCell(a) {
  return <TagChip>{a.id || '—'}</TagChip>
}

const COMMON_TAIL = [
  {
    key: 'garantiaAte',
    label: 'Garantia',
    sortable: true,
    render: (a) => {
      const w = warrantyInfo(a.garantiaAte)
      return <Badge variant={warrantyVariant(w.cls)}>{w.label}</Badge>
    },
  },
  {
    key: 'status',
    label: 'Status',
    sortable: true,
    render: (a) => <Badge variant={assetStatusVariant(a.status)}>{a.status || 'Ativo'}</Badge>,
  },
]

export const COLUMNS = {
  Todos: [
    { key: 'id', label: 'Ativo', render: idCell, sortable: true },
    { key: 'categoria', label: 'Categoria', render: (a) => a.categoria, sortable: true },
    {
      key: 'unidade',
      label: 'Unidade',
      render: (a) => unitDisplayName(a.unidade) || '—',
      sortable: true,
    },
    { key: 'departamento', label: 'Depto', render: (a) => a.departamento || '—', sortable: true },
    { key: 'usuario', label: 'Usuário', render: (a) => a.usuario || '—', sortable: true },
    { key: 'modelo', label: 'Modelo', render: (a) => a.modelo || '—', sortable: true },
    ...COMMON_TAIL,
  ],
  Desktop: [
    { key: 'id', label: 'Ativo', render: idCell, sortable: true },
    {
      key: 'unidade',
      label: 'Unidade',
      render: (a) => unitDisplayName(a.unidade) || '—',
      sortable: true,
    },
    { key: 'departamento', label: 'Depto', render: (a) => a.departamento || '—', sortable: true },
    { key: 'usuario', label: 'Usuário', render: (a) => a.usuario || '—', sortable: true },
    {
      key: 'modelo',
      label: 'Modelo',
      sortable: true,
      render: (a) => (
        <div className={tableStyles.cellStack}>
          <b>{a.modelo || '—'}</b>
          {a.so && <span>{a.so}</span>}
        </div>
      ),
    },
    {
      key: 'processador',
      label: 'Config.',
      sortable: true,
      render: (a) => {
        const parts = [a.processador, a.ram, a.armazenamento].filter(Boolean)
        return parts.length ? parts.join(' · ') : '—'
      },
    },
    { key: 'preco', label: 'Preço', sortable: true, render: (a) => fmtMoney(a.preco) },
    ...COMMON_TAIL,
  ],
  Monitor: [
    { key: 'id', label: 'Ativo', render: idCell, sortable: true },
    {
      key: 'unidade',
      label: 'Unidade',
      render: (a) => unitDisplayName(a.unidade) || '—',
      sortable: true,
    },
    { key: 'departamento', label: 'Depto', render: (a) => a.departamento || '—', sortable: true },
    { key: 'usuario', label: 'Usuário', render: (a) => a.usuario || '—', sortable: true },
    {
      key: 'pcVinculado',
      label: 'PC vinculado',
      sortable: true,
      render: (a) => (a.pcVinculado ? <TagChip>{a.pcVinculado}</TagChip> : '—'),
    },
    {
      key: 'modelo',
      label: 'Modelo',
      sortable: true,
      render: (a) => (
        <div className={tableStyles.cellStack}>
          <b>{a.modelo || '—'}</b>
          {a.tamanho && (
            <span>
              {a.tamanho} · {a.resolucao || ''}
            </span>
          )}
        </div>
      ),
    },
    { key: 'serial', label: 'Série', sortable: true, render: (a) => a.serial || '—' },
    { key: 'preco', label: 'Preço', sortable: true, render: (a) => fmtMoney(a.preco) },
    ...COMMON_TAIL,
  ],
  Celular: [
    { key: 'id', label: 'Ativo', render: idCell, sortable: true },
    {
      key: 'unidade',
      label: 'Unidade',
      render: (a) => unitDisplayName(a.unidade) || '—',
      sortable: true,
    },
    { key: 'departamento', label: 'Depto', render: (a) => a.departamento || '—', sortable: true },
    { key: 'usuario', label: 'Usuário', render: (a) => a.usuario || '—', sortable: true },
    {
      key: 'modelo',
      label: 'Modelo',
      sortable: true,
      render: (a) => (
        <div className={tableStyles.cellStack}>
          <b>{a.modelo || '—'}</b>
          {a.armazenamento && <span>{a.armazenamento}</span>}
        </div>
      ),
    },
    { key: 'imei1', label: 'IMEI', sortable: true, render: (a) => a.imei1 || '—' },
    { key: 'preco', label: 'Preço', sortable: true, render: (a) => fmtMoney(a.preco) },
    ...COMMON_TAIL,
  ],
  Impressora: [
    { key: 'id', label: 'Ativo', render: idCell, sortable: true },
    {
      key: 'unidade',
      label: 'Unidade',
      render: (a) => unitDisplayName(a.unidade) || '—',
      sortable: true,
    },
    { key: 'departamento', label: 'Depto', render: (a) => a.departamento || '—', sortable: true },
    { key: 'usuario', label: 'Usuário', render: (a) => a.usuario || '—', sortable: true },
    {
      key: 'modelo',
      label: 'Modelo',
      sortable: true,
      render: (a) => (
        <div className={tableStyles.cellStack}>
          <b>{a.modelo || '—'}</b>
          {a.tipoImpressao && <span>{a.tipoImpressao}</span>}
        </div>
      ),
    },
    { key: 'conexao', label: 'Conexão', sortable: true, render: (a) => a.conexao || '—' },
    { key: 'ip', label: 'IP', sortable: true, render: (a) => a.ip || '—' },
    { key: 'serial', label: 'Série', sortable: true, render: (a) => a.serial || '—' },
    { key: 'preco', label: 'Preço', sortable: true, render: (a) => fmtMoney(a.preco) },
    ...COMMON_TAIL,
  ],
  Televisão: [
    { key: 'id', label: 'Ativo', render: idCell, sortable: true },
    {
      key: 'unidade',
      label: 'Unidade',
      render: (a) => unitDisplayName(a.unidade) || '—',
      sortable: true,
    },
    { key: 'departamento', label: 'Depto', render: (a) => a.departamento || '—', sortable: true },
    { key: 'usuario', label: 'Responsável', render: (a) => a.usuario || '—', sortable: true },
    { key: 'localUso', label: 'Local de uso', sortable: true, render: (a) => a.localUso || '—' },
    {
      key: 'modelo',
      label: 'Marca / Modelo',
      sortable: true,
      render: (a) => (
        <div className={tableStyles.cellStack}>
          <b>{[a.marca, a.modelo].filter(Boolean).join(' ') || '—'}</b>
          {a.tamanho && (
            <span>
              {a.tamanho} · {a.resolucao || ''}
            </span>
          )}
        </div>
      ),
    },
    { key: 'serial', label: 'Série', sortable: true, render: (a) => a.serial || '—' },
    { key: 'preco', label: 'Preço', sortable: true, render: (a) => fmtMoney(a.preco) },
    ...COMMON_TAIL,
  ],
}
COLUMNS.Notebook = COLUMNS.Desktop
