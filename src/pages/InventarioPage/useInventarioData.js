import { useMemo } from 'react'
import { filterInventario, isDesatualizada, familiaSo } from '../../utils/inventarioFilter'
import { fmtBytes } from '../../utils/hostFormatters'
import { dedupeCaseInsensitive } from '../../utils/textFilter'

// Agregação da tela de Inventário: linhas filtradas, opções dos selects e
// os números da faixa de resumo. useMemo puro, sem estado — mesmo padrão de
// useEstoqueData.js.
export function useInventarioData(list, filters) {
  return useMemo(() => {
    const rows = filterInventario(list, filters)

    // Opções derivadas do que foi coletado, não de uma lista fixa: quem
    // define os fabricantes do parque é o parque (ver InventarioFilters).
    const tipos = dedupeCaseInsensitive(list.map((m) => m.tipoChassi).filter(Boolean))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((v) => ({ value: v, label: v }))

    const fabricantes = dedupeCaseInsensitive(list.map((m) => m.fabricante).filter(Boolean))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((v) => ({ value: v, label: v }))

    const sistemas = dedupeCaseInsensitive(list.map((m) => familiaSo(m.soNome)).filter(Boolean))
      .sort((a, b) => a.localeCompare(b, 'pt-BR'))
      .map((v) => ({ value: v, label: v }))

    const desatualizadas = list.filter((m) => isDesatualizada(m)).length

    // Soma da RAM do parque: dá a dimensão do conjunto e é o número que
    // aparece em orçamento de upgrade.
    const ramTotal = list.reduce((s, m) => s + (m.ramTotalBytes || 0), 0)

    // Máquinas que ainda têm HDD — o corte mais usado pra priorizar troca.
    const comHdd = list.filter((m) =>
      (m.discos ?? []).some((d) => (d.tipoMidia || '').toUpperCase() === 'HDD'),
    ).length

    // Máquinas sem acesso remoto configurado — a lista de trabalho de quem
    // vai instalar o RustDesk no parque.
    const semAcessoRemoto = list.filter((m) => !m.rustdeskId).length

    const resumo = [
      { label: 'Máquinas', value: list.length },
      { label: 'Reportando', value: list.length - desatualizadas, tone: 'ok' },
      {
        label: 'Sem acesso remoto',
        value: semAcessoRemoto,
        tone: semAcessoRemoto ? 'warn' : undefined,
      },
      {
        label: 'Sem reportar (7+ dias)',
        value: desatualizadas,
        tone: desatualizadas ? 'warn' : undefined,
      },
      { label: 'Com HDD', value: comHdd, tone: comHdd ? 'warn' : undefined },
      { label: 'RAM total', value: fmtBytes(ramTotal) },
    ]

    return { rows, opcoes: { tipos, fabricantes, sistemas }, resumo }
  }, [list, filters])
}
