import { useMemo } from 'react'
import { CATEGORIES, CAT_ICON, CAT_LABEL_PLURAL } from '../../constants/categories'
import { getUnidades, isMadvilleUnit, matchesUnitValue, MADVILLE_GROUP } from '../../utils/units'
import { fmtMoney, unitDisplayName, warrantyInfo, assetWarrantyInfo } from '../../utils/formatters'
import { buildAttentionList } from '../../utils/attention'
import { resumoFinanceiro } from '../../utils/cobertura'
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

// Toda a lógica de agregação do Dashboard, separada da renderização.
// Recebe a lista de ativos e de contatos (React Query) e a unidade
// selecionada no filtro, devolve dados já prontos para os componentes
// apresentacionais consumirem.
export function useDashboardData(assets, contatos, dashUnidade) {
  return useMemo(() => {
    const scoped = scopedByDashUnit(assets, dashUnidade)
    const unidades = getUnidades(assets)

    // ---- KPIs ----
    // Valor investido vem junto da cobertura (ver cobertura.js): preço é
    // campo opcional, então a soma fala pelos ativos que TÊM preço, não pelo
    // parque. Quem exibe precisa dos dois para não apresentar um pelo outro.
    const { total, invest, comPreco, medio, parcial } = resumoFinanceiro(scoped)
    // Mesma ideia para garantia: é ela que decide quem entra no alerta de
    // vencimento, e sem data o ativo simplesmente não é vigiado.
    const comGarantia = scoped.filter((a) => a.garantiaAte).length
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
      // `medio` já vem dividido por quem tem preço, e null quando ninguém
      // tem — ver a justificativa em cobertura.js.
      { label: 'Valor médio por ativo', value: medio === null ? '—' : fmtMoney(medio) },
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
      .map((u) => ({
        label: unitDisplayName(u),
        count: assets.filter((a) => a.unidade === u).length,
      }))
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
      raw: scoped
        .filter((a) => a.categoria === c)
        .reduce((sum, a) => sum + (parseFloat(a.preco) || 0), 0),
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
        tone: 'yellow',
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
      {
        icon: BuildingIcon,
        tone: 'blue',
        value: unidadesCount,
        label: 'Unidades',
        detail: unidadesDetail,
      },
    ]
    const financeTiles = [
      {
        icon: DollarIcon,
        tone: 'orange',
        value: fmtMoney(invest, { maximumFractionDigits: 0 }),
        label: 'Valor investido',
        // A ressalva fica À VISTA, não no popover de detalhe: o risco aqui é
        // justamente a leitura de relance — sem ela, a soma dos ativos que
        // têm preço passa por valor do parque inteiro, e é um número que
        // chega à diretoria. Some sozinha quando todo mundo estiver
        // preenchido, então não é aviso permanente, é estado atual.
        note: parcial ? `Soma ${comPreco} de ${total} com preço` : undefined,
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

    // Colaboradores (Contatos), não ativos — uma pessoa pode ter vários
    // ativos cadastrados no nome dela, o que infla uma contagem baseada em
    // Ativos e não reflete o tamanho real do time por unidade.
    const madvilleColaboradores = contatos.filter((c) => isMadvilleUnit(c.unidade)).length
    const outrasColaboradores = contatos.filter(
      (c) => c.unidade && !isMadvilleUnit(c.unidade),
    ).length
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
    // Rodapé do gráfico de status: o que a rosca NÃO mostra.
    //
    // Cuidado deliberado pra não repetir cartão vizinho: a contagem de "em
    // manutenção" já está nos mini-stats de "Requer atenção", e os inativos
    // por categoria já aparecem no popover do KPI da categoria. O que não
    // existe em lugar nenhum é ONDE estão os equipamentos parados — e é a
    // pergunta seguinte de quem olha a fatia vermelha.
    const parados = scoped.filter((a) => (a.status || 'Ativo') !== 'Ativo')
    const paradosPorUnidade = Object.entries(
      parados.reduce((mapa, a) => {
        const u = unitDisplayName(a.unidade) || 'Sem unidade'
        mapa[u] = (mapa[u] || 0) + 1
        return mapa
      }, {}),
    ).sort((x, y) => y[1] - x[1])

    const emOperacao = total - parados.length
    const statusRodape = [
      {
        label: 'Em operação',
        // Percentual E contagem: "95%" diz a saúde, "62 de 65" diz o tamanho
        // do problema. Num parque pequeno os dois discordam na leitura — 95%
        // soa ótimo, 3 máquinas paradas soa concreto.
        value: total
          ? `${Math.round((emOperacao / total) * 100)}% · ${emOperacao} de ${total}`
          : '—',
      },
      ...(paradosPorUnidade.length
        ? paradosPorUnidade.map(([unidade, qtd]) => ({
            label: `Parados · ${unidade}`,
            value: String(qtd),
          }))
        : // Confirmação explícita em vez de rodapé sumindo: "nenhum parado" é
          // informação, e um bloco que desaparece deixa a dúvida se a conta
          // rodou.
          [{ label: 'Equipamentos parados', value: 'nenhum' }]),
    ]

    const statusChart = {
      data: statuses.map((s) => ({
        label: s,
        value: scoped.filter((a) => (a.status || 'Ativo') === s).length,
      })),
      colors: DONUT_COLORS_STATUS,
      unitLabel: 'ativos',
      mostrarPercentual: true,
      rodape: statusRodape,
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

    // ---- Colaboradores por GRUPO (ver GroupSplit) ----
    // Separado em dois, e não numa lista só: são 3 unidades próprias da
    // Madville contra uma loja de fora, que é justamente a divisão que o
    // bloco de números acima existe pra marcar.
    //
    // Aqui já foram dois radares. Saíram porque radar é o gráfico errado
    // para este dado, por três motivos que se somam: 13 departamentos (radar
    // fica ilegível acima de ~8 eixos); distribuição desigual demais, com
    // Vendas dominando e todo o resto colapsando no centro, indistinguível;
    // e a área fechada não significa nada, já que departamento é categoria
    // nominal em ordem arbitrária — mudar a ordem dos eixos mudava o desenho
    // sem mudar o dado.
    //
    // Barras ordenadas (ver DeptByUnit) resolvem os três: ordem é o próprio
    // ranking, e 1 contra 3 continua visível mesmo ao lado de um 30.
    const colaboradoresPorGrupo = {
      madville: colaboradoresByDept.filter((u) => isMadvilleUnit(u.unit)),
      outras: colaboradoresByDept.filter((u) => !isMadvilleUnit(u.unit)),
    }

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

    // Cobertura dos dois campos opcionais que sustentam número no painel.
    // Um por medidor, na ordem em que doem: preço vira KPI que chega à
    // diretoria; garantia decide quem entra na lista de atenção.
    const completude = [
      {
        label: 'dos ativos têm preço cadastrado',
        filled: comPreco,
        total,
        missingLabel: 'sem preço — ficam de fora do valor investido',
      },
      {
        label: 'dos ativos têm garantia cadastrada',
        filled: comGarantia,
        total,
        missingLabel: 'sem data — não entram no alerta de vencimento',
      },
    ]

    return {
      inventoryTiles,
      financeTiles,
      miniStats,
      attentionList,
      completude,
      groupSplit,
      statusChart,
      deptByUnit,
      colaboradoresPorGrupo,
      unitDropdownItems,
      unitDropdownLabel,
    }
  }, [assets, contatos, dashUnidade])
}
