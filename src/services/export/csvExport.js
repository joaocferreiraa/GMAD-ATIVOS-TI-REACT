const BOM = String.fromCharCode(0xfeff)

// Caracteres que Excel/LibreOffice/Google Sheets tratam como início de
// fórmula quando abrem uma célula de CSV. Sem neutralizar isso, um valor
// digitado pelo usuário (ex: departamento, modelo, observações) começando
// com "=" vira código executado no programa de quem abre o arquivo
// exportado — mitigação padrão OWASP pra CSV Injection: prefixar com um
// apóstrofo força o programa a tratar a célula como texto puro.
const FORMULA_TRIGGER = /^[=+\-@\t\r]/

function sanitizeCsvCell(value) {
  return FORMULA_TRIGGER.test(value) ? `'${value}` : value
}

// Gera e baixa um CSV no navegador (mesmo formato do exportCsv() original:
// separador ";", BOM UTF-8, aspas duplas escapadas). `columns`: array de
// chaves; `rows`: array de objetos.
export function downloadCsv(filename, columns, rows) {
  const header = columns.join(';')
  const lines = rows.map((row) =>
    columns
      .map((key) => {
        let value = row[key] !== undefined && row[key] !== null ? String(row[key]) : ''
        value = sanitizeCsvCell(value)
        if (/[;"\n\r]/.test(value)) value = `"${value.replace(/"/g, '""')}"`
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
