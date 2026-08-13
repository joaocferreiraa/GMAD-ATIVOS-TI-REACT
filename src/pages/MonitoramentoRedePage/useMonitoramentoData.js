import { useMemo } from 'react'
import { getUnidades } from '../../utils/units'
import { filterMonitores } from '../../utils/monitoramentoFilter'
import { computeMonitorStatus } from '../../utils/networkStatus'

const UNIT_ORDER = ['Madville (Loja)', 'Madville (CD)', 'Madville (Soluções)', 'Gmad Curitiba']
const STATUS_SEVERITY = { offline: 4, problema: 3, atencao: 2, estavel: 1, 'sem-dados': 0 }

function orderIndex(unidade) {
  const i = UNIT_ORDER.indexOf(unidade)
  return i === -1 ? UNIT_ORDER.length : i
}

// Toda a agregação da tela de Monitoramento de Rede, separada da
// renderização (mesmo espírito de useAtivosData/useDashboardData): junta a
// config dos pontos (kv_store) com as medições recentes (tabela relacional)
// pra derivar status por ponto, resumo geral e situação por unidade. Puro —
// sem chamar Supabase aqui, só combina o que os hooks já buscaram.
export function useMonitoramentoData(monitores, assets, recentMeasurements, filters) {
  return useMemo(() => {
    const unidades = getUnidades(assets)

    // Agrupa medições recentes por ponto, da mais antiga pra mais nova
    // (getRecentMeasurements devolve mais nova -> mais antiga).
    const byMonitor = new Map()
    recentMeasurements.forEach((m) => {
      if (!m.monitorUid) return
      if (!byMonitor.has(m.monitorUid)) byMonitor.set(m.monitorUid, [])
      byMonitor.get(m.monitorUid).push(m)
    })
    byMonitor.forEach((list) => list.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)))

    const withStatus = monitores.map((m) => {
      const measurements = byMonitor.get(m.uid) || []
      const statusInfo = computeMonitorStatus(measurements, m.thresholds)
      const ultimaMedicao = measurements.length ? measurements[measurements.length - 1] : null
      return { ...m, statusInfo, ultimaMedicao }
    })

    const rows = filterMonitores(withStatus, filters)

    const total = withStatus.length
    const online = withStatus.filter((m) => m.statusInfo.status === 'estavel').length
    const atencao = withStatus.filter((m) => m.statusInfo.status === 'atencao').length
    const problemas = withStatus.filter((m) =>
      ['problema', 'offline'].includes(m.statusInfo.status),
    ).length

    const ultimaVerificacao = recentMeasurements.length
      ? recentMeasurements.reduce(
          (max, m) => (new Date(m.createdAt) > new Date(max) ? m.createdAt : max),
          recentMeasurements[0].createdAt,
        )
      : null

    const unitsWithMonitors = Array.from(new Set(withStatus.map((m) => m.unidade).filter(Boolean)))
    const unitStatus = unitsWithMonitors
      .sort((a, b) => orderIndex(a) - orderIndex(b))
      .map((unidade) => {
        const monitorsInUnit = withStatus.filter((m) => m.unidade === unidade)
        const worst = monitorsInUnit.reduce(
          (acc, m) =>
            STATUS_SEVERITY[m.statusInfo.status] > STATUS_SEVERITY[acc] ? m.statusInfo.status : acc,
          'sem-dados',
        )
        return { unidade, status: worst }
      })

    return {
      unidades,
      rows,
      allMonitors: withStatus, // sem o filtro da tabela — usado pelo seletor do gráfico em tempo real (LiveChartCard)
      summary: { total, online, atencao, problemas, ultimaVerificacao },
      unitStatus,
    }
  }, [monitores, assets, recentMeasurements, filters])
}
