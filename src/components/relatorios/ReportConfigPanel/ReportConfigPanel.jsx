import Card from '../../ui/Card/Card'
import Toolbar from '../../ui/Toolbar/Toolbar'
import Select from '../../ui/Select/Select'
import Button from '../../ui/Button/Button'
import { PrinterIcon } from '../../ui/Icon/icons'
import styles from './ReportConfigPanel.module.css'

const FORMAT_OPTIONS = [
  { value: 'excel', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV' },
  { value: 'pdf', label: 'PDF' },
]

const ORIENTATION_OPTIONS = [
  { value: 'landscape', label: 'Paisagem' },
  { value: 'portrait', label: 'Retrato' },
]

// Card "Filtros e configuração" da tela de Relatórios (#reportConfigPanel do
// sistema original): filtros dinâmicos do relatório ativo, colunas a
// exportar, ordenação, formato de exportação (e orientação, só quando o
// formato é PDF), e os botões Imprimir/Exportar.
export default function ReportConfigPanel({
  report,
  data,
  filters,
  columns,
  sortKey,
  format,
  orientation,
  onFilterChange,
  onClearFilters,
  onColumnToggle,
  onSortChange,
  onFormatChange,
  onOrientationChange,
  onPrint,
  onExport,
}) {
  return (
    <Card title="Filtros e configuração" className={styles.card}>
      {report.filters.length > 0 && (
        <Toolbar className={styles.filtersRow}>
          {report.filters.map((f) => {
            const optionLabel = f.optionLabel || ((v) => v)
            return (
              <Select
                key={f.key}
                context="toolbar"
                value={filters[f.key] || ''}
                onChange={(v) => onFilterChange(f.key, v)}
                options={[
                  { value: '', label: f.allLabel },
                  ...f.options(data).map((o) => ({ value: o, label: optionLabel(o) })),
                ]}
                aria-label={f.label}
              />
            )
          })}
          <Button variant="ghost" size="sm" onClick={onClearFilters}>
            Limpar filtros
          </Button>
        </Toolbar>
      )}

      <div className={styles.configRow}>
        <div className={styles.configCol}>
          <div className={styles.configLabel}>Colunas a exportar</div>
          <div className={styles.columns}>
            {report.columns.map((c) => (
              <label key={c.key}>
                <input
                  type="checkbox"
                  checked={!!columns[c.key]}
                  onChange={(e) => onColumnToggle(c.key, e.target.checked)}
                />
                {c.label}
              </label>
            ))}
          </div>
        </div>

        <div className={styles.configCol}>
          <div className={styles.configLabel}>Ordenar por</div>
          <Select
            value={sortKey || ''}
            onChange={onSortChange}
            options={report.columns.map((c) => ({ value: c.key, label: c.label }))}
          />

          <div className={styles.configLabel} style={{ marginTop: 14 }}>
            Formato
          </div>
          <div className={styles.formatOptions}>
            {FORMAT_OPTIONS.map((o) => (
              <label key={o.value}>
                <input
                  type="radio"
                  name="reportFormat"
                  value={o.value}
                  checked={format === o.value}
                  onChange={() => onFormatChange(o.value)}
                />
                {o.label}
              </label>
            ))}
          </div>
          {format === 'pdf' && (
            <div className={styles.formatOptions}>
              {ORIENTATION_OPTIONS.map((o) => (
                <label key={o.value}>
                  <input
                    type="radio"
                    name="reportOrientation"
                    value={o.value}
                    checked={orientation === o.value}
                    onChange={() => onOrientationChange(o.value)}
                  />
                  {o.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={styles.footer}>
        <div />
        <div className={styles.footerActions}>
          <Button size="sm" onClick={onPrint}>
            <PrinterIcon /> Imprimir
          </Button>
          <Button variant="primary" size="sm" onClick={onExport}>
            Exportar
          </Button>
        </div>
      </div>
    </Card>
  )
}
