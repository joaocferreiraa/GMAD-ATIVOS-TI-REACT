import { downloadCsv } from '../export/csvExport'

// Aplica o format() de cada coluna (ou converte para string) e usa o label
// da coluna como chave — mesmo formato de saída do reportFormattedRows()
// original, consumido pelos três exportadores e pela pré-visualização.
export function reportFormattedRows(rows, columns) {
  return rows.map((r) => {
    const out = {}
    columns.forEach((c) => {
      const raw = r[c.key]
      out[c.label] = c.format ? c.format(raw) : raw == null ? '' : String(raw)
    })
    return out
  })
}

// Nome de arquivo slugificado a partir do título do relatório + data de hoje
// (equivalente a reportFileBaseName() original).
export function reportFileBaseName(title) {
  const slug = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '_')
  return `${slug}_${new Date().toISOString().slice(0, 10)}`
}

// Metadados exibidos no cabeçalho de impressão/PDF (equivalente a
// buildReportMeta() original): resumo legível dos filtros ativos, data/hora
// de geração e quantidade de registros.
export function buildReportMeta(report, rows, filters) {
  const now = new Date()
  const filterSummary =
    report.filters
      .map((f) => {
        const val = filters[f.key]
        if (!val) return null
        return `${f.label}: ${f.optionLabel ? f.optionLabel(val) : val}`
      })
      .filter(Boolean)
      .join(' · ') || 'Nenhum filtro aplicado'
  return {
    empresa: 'Grupo GMAD',
    titulo: report.title,
    filtros: filterSummary,
    dataStr: now.toLocaleDateString('pt-BR'),
    horaStr: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    qtd: rows.length,
  }
}

// Exporta CSV com apenas as colunas ativas e valores já formatados
// (equivalente a exportGenericCsv() original — separador ";", BOM UTF-8,
// via downloadCsv() já usado pelos módulos de listagem).
export function exportReportCsv(report, rows, columns) {
  const formatted = reportFormattedRows(rows, columns)
  downloadCsv(
    `${reportFileBaseName(report.title)}.csv`,
    columns.map((c) => c.label),
    formatted,
  )
}

// Exporta um .xlsx real via SheetJS (equivalente a exportGenericExcel()
// original) — nome da planilha limitado a 31 caracteres (limite do Excel).
// `xlsx` só é carregado quando o usuário realmente exporta, em vez de entrar
// no bundle inicial de todas as páginas.
export async function exportReportExcel(report, rows, columns) {
  const XLSX = await import('xlsx')
  const formatted = reportFormattedRows(rows, columns)
  const ws = XLSX.utils.json_to_sheet(formatted, { header: columns.map((c) => c.label) })
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, report.title.slice(0, 31))
  XLSX.writeFile(wb, `${reportFileBaseName(report.title)}.xlsx`)
}

// Exporta um PDF via jsPDF + autoTable (equivalente a exportGenericPdf()
// original): cabeçalho com empresa/título/meta, depois a tabela. `jspdf`/
// `jspdf-autotable` também só carregam sob demanda, pelo mesmo motivo.
export async function exportReportPdf(report, rows, columns, orientation, filters) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
  ])
  const meta = buildReportMeta(report, rows, filters)
  const doc = new jsPDF({ orientation, unit: 'mm', format: 'a4' })
  doc.setFontSize(14)
  doc.text(meta.empresa, 14, 14)
  doc.setFontSize(11)
  doc.text(meta.titulo, 14, 21)
  doc.setFontSize(9)
  doc.text(
    `Filtros: ${meta.filtros}   |   Data: ${meta.dataStr}   |   Hora: ${meta.horaStr}   |   Registros: ${meta.qtd}`,
    14,
    27,
  )
  const formatted = reportFormattedRows(rows, columns)
  autoTable(doc, {
    startY: 32,
    head: [columns.map((c) => c.label)],
    body: formatted.map((r) => columns.map((c) => r[c.label])),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [14, 42, 22] },
  })
  doc.save(`${reportFileBaseName(report.title)}.pdf`)
}
