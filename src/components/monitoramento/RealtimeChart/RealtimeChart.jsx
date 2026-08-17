import Select from '../../ui/Select/Select'
import LineChart from '../../charts/LineChart/LineChart'
import { METRICA_OPTIONS, HISTORICO_PERIODOS } from '../../../constants/monitoramento'
import panelStyles from '../MonitoramentoPanel.module.css'

// Gráfico de linha temporal com seletor de métrica e de período — usado
// tanto na ficha de um ponto (histórico) quanto no teste de velocidade
// (evolução dos testes manuais). `measurements`: array já ordenado do mais
// antigo pro mais novo, com os campos camelCase de network_measurements
// (ver services/monitoramento/measurementsService.js). Trocar métrica ou
// período só reformata/refiltra o que já foi carregado — quem decide QUAIS
// dados carregar é quem usa este componente (ver useMonitorHistory).
export default function RealtimeChart({
  title,
  measurements,
  metric,
  onMetricChange,
  periodo,
  onPeriodoChange,
  isLoading,
}) {
  const metricInfo = METRICA_OPTIONS.find((m) => m.value === metric) || METRICA_OPTIONS[0]

  // `measurements` pode vir cru (uma linha por ping, com `disponivel`) ou
  // agregado por intervalo em períodos longos (ver useMonitorHistory), onde
  // não existe `disponivel` — lá a indisponibilidade já está embutida no
  // valor agregado (média só das checagens que responderam) e um buraco
  // aparece quando o intervalo inteiro ficou sem medição válida.
  const data = (measurements || []).map((m) => ({
    createdAt: m.createdAt,
    value: m.disponivel === false ? null : (m[metric] ?? null),
  }))

  return (
    <div>
      <div className={panelStyles.chartHeader}>
        {title && <span>{title}</span>}
        <div className={panelStyles.selectorsRow}>
          <Select
            context="toolbar"
            value={metric}
            onChange={onMetricChange}
            options={METRICA_OPTIONS.map((m) => ({ value: m.value, label: m.label }))}
            aria-label="Métrica"
          />
          <Select
            context="toolbar"
            value={periodo}
            onChange={onPeriodoChange}
            options={HISTORICO_PERIODOS.map((p) => ({ value: p.value, label: p.label }))}
            aria-label="Período"
          />
        </div>
      </div>
      {isLoading ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 12.5 }}>Carregando medições...</p>
      ) : (
        <LineChart
          data={data}
          unidade={metricInfo.unidade}
          emptyMessage="Nenhuma medição neste período ainda — aparece aqui assim que o ponto for verificado."
        />
      )}
    </div>
  )
}
