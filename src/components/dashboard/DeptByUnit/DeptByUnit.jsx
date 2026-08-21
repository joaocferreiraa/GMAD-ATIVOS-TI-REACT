import BarChart from '../../charts/BarChart/BarChart'
import EmptyHint from '../EmptyHint/EmptyHint'
import styles from './DeptByUnit.module.css'

// Cores da marca, não a paleta --chart-* (constants/chartColors.js): este
// bloco só aparece na Visão geral, que ficou de propósito na identidade
// GMAD. Ver o comentário de DEPARTMENT_COLORS em DashboardPage.jsx.
const DEPT_COLORS = [
  'var(--verde-700)',
  'var(--laranja)',
  'var(--verde-600)',
  'var(--verde-800)',
  'var(--laranja-forte)',
  'var(--verde-900)',
  'var(--info)',
  'var(--yellow)',
  'var(--indigo)',
]

// Distribuição por setor em cada unidade (.dept-by-unit) — um bloco por
// unidade, sempre com todos os ativos (não respeita o filtro do dashboard,
// igual ao sistema original). Reaproveitado também pra "Colaboradores por
// departamento" (dados de Contatos em vez de Ativos) — daí os textos vazios
// configuráveis em vez de hardcoded.
export default function DeptByUnit({
  units,
  emptyMessage = 'Nenhuma unidade cadastrada ainda.',
  // Vira PREFIXO da linha de unidades vazias ("Sem ativos: Loja · CD"), então
  // termina em dois-pontos e não em ponto final.
  itemEmptyMessage = 'Sem ativos:',
  colunas = false,
}) {
  if (!units.length) return <EmptyHint>{emptyMessage}</EmptyHint>

  // Unidade sem nenhum registro não ganha bloco próprio. Antes ganhava, e o
  // grid esticava a caixa vazia até a altura do gráfico vizinho — meia tela
  // em branco para dizer "zero". Elas viram uma linha só no fim, que informa
  // o mesmo ocupando o que a informação vale.
  const comDados = units.filter((u) => u.bars.length)
  const semDados = units.filter((u) => !u.bars.length)

  // Nomes só quando há mais de uma unidade no grupo: com uma só, ela já está
  // nomeada no cabeçalho logo acima, e repetir vira eco ("0 · GMAD Curitiba"
  // seguido de "Sem colaboradores: GMAD Curitiba"). Sem a lista, os
  // dois-pontos do rótulo ficariam pendurados — daí serem removidos.
  const listarNomes = units.length > 1
  const textoVazio = listarNomes ? itemEmptyMessage : itemEmptyMessage.replace(/:\s*$/, '')

  return (
    <div className={styles.wrap}>
      {comDados.length ? (
        <div className={styles.grid}>
          {comDados.map((unit) => (
            <div key={unit.unit} className={styles.block}>
              <div className={styles.title}>
                {unit.label} <span className={styles.count}>{unit.total}</span>
              </div>
              <BarChart
                data={unit.bars}
                colors={DEPT_COLORS}
                compact
                showTotal={false}
                colunas={colunas}
                // Cor pelo NOME do departamento, não pela posição: cada bloco
                // ordena os seus por quantidade, então "Financeiro" cai em
                // índices diferentes em cada unidade e mudava de cor de um
                // bloco pro outro. Quem lê acompanha cor — duas cores pro
                // mesmo setor sugere que são setores diferentes.
                corPorRotulo
              />
            </div>
          ))}
        </div>
      ) : null}

      {semDados.length ? (
        <div className={styles.vazias}>
          <span className={styles.vaziasLabel}>{textoVazio}</span>
          {listarNomes ? (
            <span className={styles.vaziasUnidades}>
              {semDados.map((u) => u.label).join(' · ')}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
