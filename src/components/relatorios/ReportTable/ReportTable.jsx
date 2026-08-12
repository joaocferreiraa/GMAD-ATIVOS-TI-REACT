import { useMemo } from 'react'
import Table from '../../ui/Table/Table'

// Pré-visualização do relatório ativo (#reportTable do sistema original) —
// colunas e linhas totalmente dinâmicas conforme o relatório e as colunas
// marcadas em "Colunas a exportar". Sem ordenação por clique no cabeçalho
// (a ordenação é feita pelo seletor "Ordenar por" do painel de config,
// igual ao original).
export default function ReportTable({ columns, rows }) {
  const tableColumns = columns.map((c) => ({
    key: c.key,
    label: c.label,
    render: (r) => {
      const raw = r[c.key]
      return c.format ? c.format(raw, r) : raw == null || raw === '' ? '—' : String(raw)
    },
  }))

  // Linhas de relatório não têm uma chave de identidade estável e comum a
  // todos os tipos (nem todo relatório tem `uid`) — o índice na lista já
  // filtrada/ordenada serve como chave, já que são apenas texto estático.
  const keyedRows = useMemo(() => rows.map((r, i) => ({ ...r, __rowKey: i })), [rows])

  return (
    <Table
      columns={tableColumns}
      rows={keyedRows}
      rowKey="__rowKey"
      paginate={false}
      emptyTitle="Nenhum registro encontrado"
      emptyMessage="Ajuste os filtros para gerar o relatório."
    />
  )
}
