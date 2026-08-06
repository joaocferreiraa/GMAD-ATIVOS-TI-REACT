import { useMemo } from 'react'
import { REPORT_DEFS } from '../../constants/reports'
import { computeReportRows } from '../../utils/reportFilter'
import { buildReportMeta } from '../../services/relatorios/reportExport'

// Agregação da tela de Relatórios, separada da renderização — equivalente
// ao REPORTS + reportComputedRows()/reportActiveColumns()/buildReportMeta()
// do sistema original. `data`: { assets, stock, contatos, installers,
// scripts, logEntries } (já com fallback para array vazio).
export function useRelatoriosData(data, uiState) {
  const { activeKey, filters, columns, sortKey } = uiState

  const reports = useMemo(
    () => REPORT_DEFS.map((def) => ({ ...def, rows: def.buildRows(data) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data.assets, data.stock, data.contatos, data.installers, data.scripts, data.logEntries],
  )

  const activeReport = activeKey ? reports.find((r) => r.key === activeKey) : null

  const rows = useMemo(
    () => (activeReport ? computeReportRows(activeReport, filters, sortKey) : []),
    [activeReport, filters, sortKey],
  )

  const activeColumns = useMemo(
    () => (activeReport ? activeReport.columns.filter((c) => columns[c.key]) : []),
    [activeReport, columns],
  )

  const meta = useMemo(
    () => (activeReport ? buildReportMeta(activeReport, rows, filters) : null),
    [activeReport, rows, filters],
  )

  return { reports, activeReport, rows, activeColumns, meta }
}
