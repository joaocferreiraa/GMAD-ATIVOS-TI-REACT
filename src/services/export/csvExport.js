const BOM = String.fromCharCode(0xfeff)

// Gera e baixa um CSV no navegador (mesmo formato do exportCsv() original:
// separador ";", BOM UTF-8, aspas duplas escapadas). `columns`: array de
// chaves; `rows`: array de objetos.
export function downloadCsv(filename, columns, rows) {
  const header = columns.join(';')
  const lines = rows.map((row) =>
    columns
      .map((key) => {
        let value = row[key] !== undefined && row[key] !== null ? String(row[key]) : ''
        if (value.includes(';') || value.includes('"')) value = `"${value.replace(/"/g, '""')}"`
        return value
      })
      .join(';'),
  )
  const csv = BOM + [header, ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
