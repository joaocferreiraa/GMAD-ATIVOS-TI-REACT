import { useState } from 'react'
import { useAssets } from '../../hooks/data/useAssets'
import { useStock } from '../../hooks/data/useStock'
import { useContatos } from '../../hooks/data/useContatos'
import { useInstaladores } from '../../hooks/data/useInstaladores'
import { useScripts } from '../../hooks/data/useScripts'
import { useInfra } from '../../hooks/data/useInfra'
import { useAtividade } from '../../hooks/data/useAtividade'
import { useChamados } from '../../hooks/data/useChamados'
import {
  useInventario,
  useSoftwareDoParque,
  useNetworkDevices,
} from '../../hooks/data/useInventario'
import { useMonitores } from '../../hooks/data/useMonitores'
import { useAlertas } from '../../hooks/data/useAlertas'
import { useRelatoriosData } from './useRelatoriosData'
import { useToast } from '../../hooks/useToast'
import {
  exportReportCsv,
  exportReportExcel,
  exportReportPdf,
} from '../../services/relatorios/reportExport'
import Button from '../../components/ui/Button/Button'
import TableSkeleton from '../../components/ui/TableSkeleton/TableSkeleton'
import Alert from '../../components/ui/Alert/Alert'
import PrintHeader from '../../components/ui/PrintHeader/PrintHeader'
import ReportCard from '../../components/relatorios/ReportCard/ReportCard'
import ReportConfigPanel from '../../components/relatorios/ReportConfigPanel/ReportConfigPanel'
import ReportTable from '../../components/relatorios/ReportTable/ReportTable'
import styles from './RelatoriosPage.module.css'

const HOME_HEADING = 'Central de Relatórios'
const HOME_SUBHEADING = 'Gere, filtre e exporte relatórios de qualquer módulo do sistema.'

export default function RelatoriosPage() {
  const [uiState, setUiState] = useState({
    activeKey: null,
    filters: {},
    columns: {},
    sortKey: null,
    format: 'excel',
    orientation: 'landscape',
  })
  // Pedido explícito de carregar os dados de um relatório `lazy` (ver
  // REPORT_DEFS). Guarda a chave do relatório, não um booleano: sair dele e
  // voltar não deve disparar a busca pesada de novo sem querer.
  const [lazyPedido, setLazyPedido] = useState(null)

  const assetsQ = useAssets()
  const stockQ = useStock()
  const contatosQ = useContatos()
  const installersQ = useInstaladores()
  const scriptsQ = useScripts()
  const infraQ = useInfra()
  const atividadeQ = useAtividade()
  const chamadosQ = useChamados()
  const inventarioQ = useInventario()
  const dispositivosQ = useNetworkDevices()
  const monitoresQ = useMonitores()
  const alertasQ = useAlertas({})
  // `enabled` só depois do clique — é o que faz "sob demanda" ser sob
  // demanda. Ver o comentário de `lazy` em constants/reports.js.
  const softwareQ = useSoftwareDoParque({ enabled: lazyPedido === 'software' })
  const { showToast } = useToast()

  const data = {
    assets: assetsQ.data ?? [],
    stock: stockQ.data ?? [],
    contatos: contatosQ.data ?? [],
    installers: installersQ.data ?? [],
    scripts: scriptsQ.data ?? [],
    wifi: infraQ.data?.wifi ?? [],
    construshow: infraQ.data?.construshow ?? [],
    logEntries: atividadeQ.data ?? [],
    chamados: chamadosQ.data ?? [],
    inventario: inventarioQ.data ?? [],
    dispositivos: dispositivosQ.data ?? [],
    monitores: monitoresQ.data ?? [],
    alertas: alertasQ.data ?? [],
    softwareParque: softwareQ.data ?? [],
  }
  // Inventário, dispositivos, monitores e alertas ficam FORA do
  // isLoading/isError geral: essas tabelas podem nem existir (migrations
  // 0001/0008/0011 não rodadas em uma instalação nova) e, dentro do
  // agregado, uma delas faltando derrubaria a Central inteira — inclusive os
  // relatórios de ativos e contatos, que não têm nada a ver. Cada relatório
  // novo mostra a própria lista vazia nesse caso.
  const isLoading =
    assetsQ.isLoading ||
    stockQ.isLoading ||
    contatosQ.isLoading ||
    installersQ.isLoading ||
    scriptsQ.isLoading ||
    infraQ.isLoading ||
    atividadeQ.isLoading ||
    chamadosQ.isLoading
  const isError =
    assetsQ.isError ||
    stockQ.isError ||
    contatosQ.isError ||
    installersQ.isError ||
    scriptsQ.isError ||
    infraQ.isError ||
    atividadeQ.isError ||
    chamadosQ.isError

  const { reports, activeReport, rows, activeColumns, meta } = useRelatoriosData(data, uiState)

  // Estados do relatório sob demanda. `lazyPendente` é o único que depende
  // do pedido: os outros dois só existem depois que a busca começou.
  const lazyPendente = !!activeReport?.lazy && lazyPedido !== activeReport.key
  const lazyCarregando = !!activeReport?.lazy && !lazyPendente && softwareQ.isLoading
  const lazyErro = !!activeReport?.lazy && !lazyPendente && softwareQ.isError

  function openReport(key) {
    const report = reports.find((r) => r.key === key)
    if (!report) return
    setUiState({
      activeKey: key,
      filters: {},
      // `defaultOff` abre a coluna desmarcada — ela continua no seletor.
      // Ver o porquê em constants/reports.js.
      columns: Object.fromEntries(report.columns.map((c) => [c.key, !c.defaultOff])),
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

          {/* Relatório com carregamento sob demanda antes do clique: mostra
              o convite em vez de uma tabela vazia, que passaria a impressão
              de "não há nada cadastrado". */}
          {lazyPendente && (
            <Alert variant="info">
              <p className={styles.lazyHint}>{activeReport.lazy.hint}</p>
              <Button size="sm" onClick={() => setLazyPedido(activeReport.key)}>
                {activeReport.lazy.label}
              </Button>
            </Alert>
          )}

          {(isLoading || lazyCarregando) && <TableSkeleton columns={activeColumns.length || 5} />}

          {isError && (
            <Alert variant="danger">
              Não foi possível carregar os dados do relatório. Verifique sua conexão.
            </Alert>
          )}

          {lazyErro && (
            <Alert variant="danger">
              Não foi possível carregar o catálogo de software. Verifique se o agente já reportou
              inventário nas máquinas.
            </Alert>
          )}

          {!isLoading && !isError && !lazyPendente && !lazyCarregando && !lazyErro && (
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
