import { useState } from 'react'
import { useAssets } from '../../hooks/data/useAssets'
import { useStock } from '../../hooks/data/useStock'
import { useContatos } from '../../hooks/data/useContatos'
import { useInstaladores } from '../../hooks/data/useInstaladores'
import { useScripts } from '../../hooks/data/useScripts'
import { useAtividade } from '../../hooks/data/useAtividade'
import { useRelatoriosData } from './useRelatoriosData'
import { useToast } from '../../hooks/useToast'
import {
  exportReportCsv,
  exportReportExcel,
  exportReportPdf,
} from '../../services/relatorios/reportExport'
import Button from '../../components/ui/Button/Button'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import PrintHeader from '../../components/ui/PrintHeader/PrintHeader'
import ReportCard from '../../components/relatorios/ReportCard/ReportCard'
import ReportConfigPanel from '../../components/relatorios/ReportConfigPanel/ReportConfigPanel'
import ReportTable from '../../components/relatorios/ReportTable/ReportTable'
import styles from './RelatoriosPage.module.css'

const HOME_HEADING = 'Central de Relatórios'
const HOME_SUBHEADING = 'Gere, filtre e exporte relatórios de qualquer módulo do sistema.'

export default function RelatoriosPage() {
  const assetsQ = useAssets()
  const stockQ = useStock()
  const contatosQ = useContatos()
  const installersQ = useInstaladores()
  const scriptsQ = useScripts()
  const atividadeQ = useAtividade()
  const { showToast } = useToast()

  const data = {
    assets: assetsQ.data ?? [],
    stock: stockQ.data ?? [],
    contatos: contatosQ.data ?? [],
    installers: installersQ.data ?? [],
    scripts: scriptsQ.data ?? [],
    logEntries: atividadeQ.data ?? [],
  }
  const isLoading =
    assetsQ.isLoading ||
    stockQ.isLoading ||
    contatosQ.isLoading ||
    installersQ.isLoading ||
    scriptsQ.isLoading ||
    atividadeQ.isLoading
  const isError =
    assetsQ.isError ||
    stockQ.isError ||
    contatosQ.isError ||
    installersQ.isError ||
    scriptsQ.isError ||
    atividadeQ.isError

  const [uiState, setUiState] = useState({
    activeKey: null,
    filters: {},
    columns: {},
    sortKey: null,
    format: 'excel',
    orientation: 'landscape',
  })

  const { reports, activeReport, rows, activeColumns, meta } = useRelatoriosData(data, uiState)

  function openReport(key) {
    const report = reports.find((r) => r.key === key)
    if (!report) return
    setUiState({
      activeKey: key,
      filters: {},
      columns: Object.fromEntries(report.columns.map((c) => [c.key, true])),
      sortKey: report.columns[0].key,
      format: 'excel',
      orientation: 'landscape',
    })
  }

  function closeReport() {
    setUiState((s) => ({ ...s, activeKey: null }))
  }

  function updateFilter(key, value) {
    setUiState((s) => ({ ...s, filters: { ...s.filters, [key]: value } }))
  }

  function clearFilters() {
    setUiState((s) => ({ ...s, filters: {} }))
  }

  function toggleColumn(key, checked) {
    setUiState((s) => ({ ...s, columns: { ...s.columns, [key]: checked } }))
  }

  function handlePrint() {
    window.print()
  }

  async function handleExport() {
    if (!activeColumns.length) {
      showToast('Selecione ao menos uma coluna.', 'danger')
      return
    }
    if (!rows.length) {
      showToast('Nada para exportar com os filtros atuais.', 'danger')
      return
    }
    if (uiState.format === 'csv') {
      exportReportCsv(activeReport, rows, activeColumns)
      showToast(`CSV exportado (${rows.length} registros).`)
    } else if (uiState.format === 'pdf') {
      await exportReportPdf(activeReport, rows, activeColumns, uiState.orientation, uiState.filters)
      showToast(`PDF exportado (${rows.length} registros).`)
    } else {
      await exportReportExcel(activeReport, rows, activeColumns)
      showToast(`Excel exportado (${rows.length} registros).`)
    }
  }

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>{activeReport ? activeReport.title : HOME_HEADING}</h2>
          <p>{activeReport ? activeReport.desc : HOME_SUBHEADING}</p>
        </div>
        {activeReport && (
          <div className={styles.actionsRow}>
            <Button size="sm" onClick={closeReport}>
              ← Voltar aos relatórios
            </Button>
          </div>
        )}
      </div>

      {!activeReport && (
        <div className={styles.reportsGrid}>
          {reports.map((report) => (
            <ReportCard key={report.key} report={report} onOpen={openReport} />
          ))}
        </div>
      )}

      {activeReport && (
        <>
          <ReportConfigPanel
            report={activeReport}
            data={data}
            filters={uiState.filters}
            columns={uiState.columns}
            sortKey={uiState.sortKey}
            format={uiState.format}
            orientation={uiState.orientation}
            onFilterChange={updateFilter}
            onClearFilters={clearFilters}
            onColumnToggle={toggleColumn}
            onSortChange={(sortKey) => setUiState((s) => ({ ...s, sortKey }))}
            onFormatChange={(format) => setUiState((s) => ({ ...s, format }))}
            onOrientationChange={(orientation) => setUiState((s) => ({ ...s, orientation }))}
            onPrint={handlePrint}
            onExport={handleExport}
          />

          {isLoading && (
            <div className={styles.state}>
              <Loading label="Carregando dados do relatório..." />
            </div>
          )}

          {isError && (
            <Alert variant="danger">
              Não foi possível carregar os dados do relatório. Verifique sua conexão.
            </Alert>
          )}

          {!isLoading && !isError && (
            <div id="report-printable">
              {meta && <PrintHeader {...meta} />}
              <ReportTable columns={activeColumns} rows={rows} />
            </div>
          )}
        </>
      )}
    </div>
  )
}
