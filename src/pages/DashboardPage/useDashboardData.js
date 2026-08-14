import { useMemo } from 'react'
import { CATEGORIES, CAT_ICON, CAT_LABEL_PLURAL } from '../../constants/categories'
import { getUnidades, isMadvilleUnit, matchesUnitValue, MADVILLE_GROUP } from '../../utils/units'
import { fmtMoney, unitDisplayName, warrantyInfo, assetWarrantyInfo } from '../../utils/formatters'
import { buildAttentionList } from '../../utils/attention'
import { BuildingIcon, DollarIcon, StockIcon } from '../../components/ui/Icon/icons'
import { ROUTES } from '../../constants/routes'

const DONUT_COLORS_STATUS = ['var(--ok)', 'var(--warn)', 'var(--danger)']

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

// Mesmo parse de data usado em warrantyInfo() (formatters.js), pra tratar
// "2024-03-15T00:00:00" de forma consistente com o resto do app.
function hasValidDate(iso) {
  return Boolean(iso) && !Number.isNaN(new Date(`${iso}T00:00:00`).getTime())
}

// Toda a lógica de agregação do Dashboard, separada da renderização.
// Recebe a lista de ativos e de contatos (React Query) e a unidade
// selecionada no filtro, devolve dados já prontos para os componentes
// apresentacionais consumirem.
export function useDashboardData(assets, contatos, dashUnidade) {
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

    // ---- Detalhe on-hover de cada KPI: sempre algo que não está em nenhum
    // outro card do painel (valores em R$ por categoria, saúde por
    // categoria, maior/menor unidade, top categorias por valor) ----
    const totalDetail = [
      { label: 'Valor investido', value: fmtMoney(invest, { maximumFractionDigits: 0 }) },
      { label: 'Valor médio por ativo', value: fmtMoney(total ? invest / total : 0) },
    ]

    function categoryDetail(categoria) {
      const inCat = scoped.filter((a) => a.categoria === categoria)
      const catInvest = inCat.reduce((sum, a) => sum + (parseFloat(a.preco) || 0), 0)
      const rows = [
        { label: 'Valor investido', value: fmtMoney(catInvest, { maximumFractionDigits: 0 }) },
        { label: 'Em manutenção', value: inCat.filter((a) => a.status === 'Manutenção').length },
        { label: 'Inativos', value: inCat.filter((a) => a.status === 'Inativo').length },
      ]
      if (categoria === 'Impressora') {
        rows.push({ label: 'Compradas', value: inCat.filter((a) => a.posse === 'Comprado').length })
        rows.push({ label: 'Alugadas', value: inCat.filter((a) => a.posse === 'Alugado').length })
      }
      return rows
    }

    const unitCounts = unidades
      .map((u) => ({ label: unitDisplayName(u), count: assets.filter((a) => a.unidade === u).length }))
      .sort((a, b) => b.count - a.count)
    const unidadesDetail = unitCounts.length
      ? [
          {
            label: 'Maior unidade',
            value: `${unitCounts[0].label} · ${unitCounts[0].count}`,
          },
          {
            label: 'Menor unidade',
            value: `${unitCounts[unitCounts.length - 1].label} · ${unitCounts[unitCounts.length - 1].count}`,
          },
        ]
      : []

    const investDetail = CATEGORIES.map((c) => ({
      label: CAT_LABEL_PLURAL[c],
      raw: scoped.filter((a) => a.categoria === c).reduce((sum, a) => sum + (parseFloat(a.preco) || 0), 0),
    }))
      .filter((c) => c.raw > 0)
      .sort((a, b) => b.raw - a.raw)
      .slice(0, 3)
      .map((c) => ({ label: c.label, value: fmtMoney(c.raw, { maximumFractionDigits: 0 }) }))

    // Cada tile de categoria (e o total) leva pra Ativos cadastrados já
    // filtrado por essa categoria e pela unidade selecionada aqui no
    // Dashboard (mesmo mecanismo location.state.filters do sino de
    // notificações, lido em AtivosPage). "Unidades" e "Valor investido" não
    // mapeiam pra um filtro de Ativos, então continuam só com o popover de
    // detalhe ao clicar.
    const tileFilters = (categoria) => ({
      route: ROUTES.ativos,
      state: { filters: { unidade: dashUnidade, categoria } },
    })

    const inventoryTiles = [
      {
        icon: StockIcon,
        tone: 'green',
        value: total,
        label: 'Total de ativos',
        detail: totalDetail,
        to: tileFilters('Todos'),
      },
      ...CATEGORIES.map((c) => ({
        icon: CAT_ICON[c],
        tone: 'green',
        value: scoped.filter((a) => a.categoria === c).length,
        label: CAT_LABEL_PLURAL[c],
        detail: categoryDetail(c),
        to: tileFilters(c),
      })),
      { icon: BuildingIcon, tone: 'green', value: unidadesCount, label: 'Unidades', detail: unidadesDetail },
    ]
    const financeTiles = [
      {
        icon: DollarIcon,
        tone: 'orange',
        value: fmtMoney(invest, { maximumFractionDigits: 0 }),
        label: 'Valor investido',
        detail: investDetail,
      },
    ]

    // ---- Mini stats (Requer atenção) ----
    const manut = scoped.filter((a) => a.status === 'Manutenção').length
    const venc = scoped.filter(
      (a) => a.garantiaAte && warrantyInfo(a.garantiaAte).cls === 'warn',
    ).length
    const semGarantia = scoped.filter((a) => assetWarrantyInfo(a).cls === 'missing').length
    const semEtiqueta = scoped.filter((a) => a.etiqueta !== 'Possui').length
    const miniStats = [
      { tone: 'warn', value: manut, label: 'Em manutenção' },
      { tone: 'danger', value: venc, label: 'Garantias vencendo' },
      { tone: 'leaf', value: semGarantia, label: 'Sem garantia' },
      { tone: 'leaf', value: semEtiqueta, label: 'Sem etiqueta física' },
    ]

    // ---- Lista de atenção (até 8 itens) ----
    const attentionList = buildAttentionList(scoped)

    // ---- Completude do cadastro de data de aquisição (respeita o filtro de
    // unidade) ---- dataAquisicao nunca vira métrica em nenhum outro lugar
    // do painel hoje — diferente da contagem por categoria, que já
    // duplicava os tiles do KpiStrip logo acima. Boa parte do parque ainda
    // não tem essa data cadastrada, então uma distribuição por faixa etária
    // ficaria dominada por "sem data" — mostra o quanto falta preencher em
    // vez disso, o que é acionável (e cresce sozinho conforme a equipe
    // preenche o campo em Ativos).
    const ageCompleteness = {
      filled: scoped.filter((a) => hasValidDate(a.dataAquisicao)).length,
      total: scoped.length,
    }

    // Colaboradores (Contatos), não ativos — uma pessoa pode ter vários
    // ativos cadastrados no nome dela, o que infla uma contagem baseada em
    // Ativos e não reflete o tamanho real do time por unidade.
    const madvilleColaboradores = contatos.filter((c) => isMadvilleUnit(c.unidade)).length
    const outrasColaboradores = contatos.filter((c) => c.unidade && !isMadvilleUnit(c.unidade)).length
    const madvilleUnitCount = unidades.filter(isMadvilleUnit).length
    const groupSplit = {
      madville: {
        value: madvilleColaboradores,
        label: `GMAD Madville · ${madvilleUnitCount} unidade(s) própria(s)`,
      },
      outras: { value: outrasColaboradores, label: 'GMAD Curitiba' },
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

    // ---- Colaboradores por departamento (Contatos, não Ativos — nunca
    // cruzado com o Dashboard antes; sempre todas as unidades, mesmo padrão
    // de "Distribuição por setor" acima) ----
    const colaboradoresByDept = orderedBy(unidades, UNIT_SELECT_ORDER).map((u) => {
      const unitContatos = contatos.filter((c) => c.unidade === u)
      const depts = Array.from(
        new Set(unitContatos.map((c) => c.departamento).filter(Boolean)),
      ).sort()
      const counts = depts.map((d) => ({
        label: d,
        value: unitContatos.filter((c) => c.departamento === d).length,
      }))
      const semDept = unitContatos.filter((c) => !c.departamento).length
      if (semDept) counts.push({ label: 'Sem departamento', value: semDept })
      counts.sort((a, b) => b.value - a.value)
      return { unit: u, label: unitDisplayName(u), total: unitContatos.length, bars: counts }
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
      ageCompleteness,
      groupSplit,
      statusChart,
      deptByUnit,
      colaboradoresByDept,
      unitDropdownItems,
      unitDropdownLabel,
    }
  }, [assets, contatos, dashUnidade])
}
