import { useMemo } from 'react'
import { CATEGORIES, CAT_ICON, CAT_LABEL_PLURAL } from '../../constants/categories'
import { getUnidades, isMadvilleUnit, matchesUnitValue, MADVILLE_GROUP } from '../../utils/units'
import { fmtMoney, unitDisplayName, warrantyInfo } from '../../utils/formatters'
import { BuildingIcon, DollarIcon, StockIcon } from '../../components/ui/Icon/icons'

const DONUT_COLORS_CAT = [
  'var(--verde-700)',
  'var(--laranja)',
  'var(--verde-600)',
  'var(--verde-800)',
  'var(--laranja-forte)',
  'var(--verde-900)',
]
const DONUT_COLORS_STATUS = ['var(--ok)', 'var(--warn)', 'var(--danger)']
const DONUT_COLORS_UNI = [
  'var(--verde-900)',
  'var(--laranja)',
  'var(--verde-600)',
  'var(--verde-700)',
  'var(--laranja-forte)',
  'var(--verde-800)',
]

const UNIT_SELECT_ORDER = [
  'Madville (Loja)',
  'Madville (CD)',
  'Madville (Soluções)',
  'Gmad Curitiba',
]

function orderedBy(list, order) {
  return list.slice().sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    if (ia === -1 && ib === -1) return 0
    if (ia === -1) return 1
    if (ib === -1) return -1
    return ia - ib
  })
}

function scopedByDashUnit(assets, dashUnidade) {
  return dashUnidade === 'Todas'
    ? assets
    : assets.filter((a) => matchesUnitValue(a.unidade, dashUnidade))
}

// Toda a lógica de agregação do Dashboard, separada da renderização.
// Recebe a lista de ativos (React Query) e a unidade selecionada no filtro,
// devolve dados já prontos para os componentes apresentacionais consumirem.
export function useDashboardData(assets, dashUnidade) {
  return useMemo(() => {
    const scoped = scopedByDashUnit(assets, dashUnidade)
    const unidades = getUnidades(assets)

    // ---- KPIs ----
    const total = scoped.length
    const invest = scoped.reduce((sum, a) => sum + (parseFloat(a.preco) || 0), 0)
    const unidadesCount =
      dashUnidade === 'Todas'
        ? unidades.length
        : dashUnidade === MADVILLE_GROUP
          ? unidades.filter(isMadvilleUnit).length
          : 1

    const inventoryTiles = [
      { icon: StockIcon, tone: 'green', value: total, label: 'Total de ativos' },
      ...CATEGORIES.map((c) => ({
        icon: CAT_ICON[c],
        tone: 'green',
        value: scoped.filter((a) => a.categoria === c).length,
        label: CAT_LABEL_PLURAL[c],
      })),
      { icon: BuildingIcon, tone: 'green', value: unidadesCount, label: 'Unidades' },
    ]
    const financeTiles = [
      {
        icon: DollarIcon,
        tone: 'orange',
        value: fmtMoney(invest, { maximumFractionDigits: 0 }),
        label: 'Valor investido',
      },
    ]

    // ---- Mini stats (Requer atenção) ----
    const manut = scoped.filter((a) => a.status === 'Manutenção').length
    const venc = scoped.filter(
      (a) => a.garantiaAte && warrantyInfo(a.garantiaAte).cls === 'warn',
    ).length
    const semEtiqueta = scoped.filter((a) => a.etiqueta !== 'Possui').length
    const miniStats = [
      { tone: 'warn', value: manut, label: 'Em manutenção' },
      { tone: 'danger', value: venc, label: 'Garantias vencendo' },
      { tone: 'leaf', value: semEtiqueta, label: 'Sem etiqueta física' },
    ]

    // ---- Lista de atenção (até 8 itens) ----
    const attentionList = scoped
      .filter((a) => {
        if (a.status === 'Manutenção') return true
        if (!a.garantiaAte) return false
        const cls = warrantyInfo(a.garantiaAte).cls
        return cls === 'warn' || cls === 'expired'
      })
      .slice(0, 8)
      .map((a) => ({
        id: a.uid,
        title: `${a.id} · ${a.usuario || unitDisplayName(a.unidade) || ''}`,
        subtitle: a.status === 'Manutenção' ? 'Em manutenção' : warrantyInfo(a.garantiaAte).label,
        status: a.status || 'Ativo',
      }))

    // ---- Gráfico por categoria (respeita o filtro de unidade) ----
    const categoryChart = {
      data: CATEGORIES.map((c) => ({
        label: CAT_LABEL_PLURAL[c],
        value: scoped.filter((a) => a.categoria === c).length,
      })),
      colors: DONUT_COLORS_CAT,
      unitLabel: 'ativos',
    }

    // ---- Gráfico por unidade (sempre todas as unidades, sem o filtro) ----
    const unitChart = {
      data: unidades.map((u) => ({
        label: unitDisplayName(u),
        value: assets.filter((a) => a.unidade === u).length,
      })),
      colors: DONUT_COLORS_UNI,
      unitLabel: 'ativos',
    }

    const madvilleTotal = assets.filter((a) => isMadvilleUnit(a.unidade)).length
    const outrasTotal = assets.filter((a) => a.unidade && !isMadvilleUnit(a.unidade)).length
    const madvilleUnitCount = unidades.filter(isMadvilleUnit).length
    const groupSplit = {
      madville: {
        value: madvilleTotal,
        label: `GMAD Madville · ${madvilleUnitCount} unidade(s) própria(s)`,
      },
      outras: { value: outrasTotal, label: 'GMAD Curitiba' },
    }

    // ---- Gráfico por status (respeita o filtro de unidade) ----
    const statuses = ['Ativo', 'Manutenção', 'Inativo']
    const statusChart = {
      data: statuses.map((s) => ({
        label: s,
        value: scoped.filter((a) => (a.status || 'Ativo') === s).length,
      })),
      colors: DONUT_COLORS_STATUS,
      unitLabel: 'ativos',
    }

    // ---- Distribuição por setor (sempre todas as unidades) ----
    const deptByUnit = orderedBy(unidades, UNIT_SELECT_ORDER).map((u) => {
      const unitScoped = assets.filter((a) => a.unidade === u)
      const depts = Array.from(
        new Set(unitScoped.map((a) => a.departamento).filter(Boolean)),
      ).sort()
      const counts = depts.map((d) => ({
        label: d,
        value: unitScoped.filter((a) => a.departamento === d).length,
      }))
      const semDept = unitScoped.filter((a) => !a.departamento).length
      if (semDept) counts.push({ label: 'Sem departamento', value: semDept })
      counts.sort((a, b) => b.value - a.value)
      return { unit: u, label: unitDisplayName(u), total: unitScoped.length, bars: counts }
    })

    // ---- Dropdown de unidade ----
    const unitDropdownItems = [
      { value: 'Todas', label: 'Todas as unidades' },
      ...orderedBy(unidades, UNIT_SELECT_ORDER).map((u) => ({
        value: u,
        label: unitDisplayName(u),
      })),
    ]
    const unitDropdownLabel =
      dashUnidade === 'Todas'
        ? 'Todas as unidades'
        : dashUnidade === MADVILLE_GROUP
          ? 'Todos os dispositivos GMAD Madville'
          : unitDisplayName(dashUnidade)

    return {
      inventoryTiles,
      financeTiles,
      miniStats,
      attentionList,
      categoryChart,
      unitChart,
      groupSplit,
      statusChart,
      deptByUnit,
      unitDropdownItems,
      unitDropdownLabel,
    }
  }, [assets, dashUnidade])
}
