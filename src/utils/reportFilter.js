// Lista de linhas de um relatório filtrada e ordenada (equivalente a
// reportComputedRows() do sistema original). `filters`: { [filterKey]: valor
// selecionado } — comparação por igualdade estrita de string, igual ao
// original. `sortKey` ordena numericamente quando ambos os valores são
// numéricos, senão por locale pt-BR.
export function computeReportRows(report, filters, sortKey) {
  let rows = report.rows.slice()
  report.filters.forEach((f) => {
    const val = filters[f.key]
    if (val) rows = rows.filter((r) => String(r[f.key] || '') === val)
  })
  if (sortKey) {
    rows.sort((a, b) => {
      const va = a[sortKey]
      const vb = b[sortKey]
      const na = parseFloat(va)
      const nb = parseFloat(vb)
      if (!Number.isNaN(na) && !Number.isNaN(nb) && String(va).trim() !== '' && String(vb).trim() !== '') {
        return na - nb
      }
      return String(va || '').localeCompare(String(vb || ''), 'pt-BR')
    })
  }
  return rows
}
