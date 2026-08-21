import { useEffect, useState } from 'react'
import { useAssets } from '../../hooks/data/useAssets'
import { useContatos } from '../../hooks/data/useContatos'
import { useAuth } from '../../hooks/auth/useAuth'
import { useNavigateTo } from '../../hooks/useNavigateTo'
import { useDashboardData } from './useDashboardData'
import { greetingName, greetingForHour } from '../../utils/formatters'
import Card from '../../components/ui/Card/Card'
import Dropdown from '../../components/ui/Dropdown/Dropdown'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import KpiStrip from '../../components/dashboard/KpiStrip/KpiStrip'
import MiniStats from '../../components/dashboard/MiniStats/MiniStats'
import AttentionList from '../../components/dashboard/AttentionList/AttentionList'
import CompletionMeter from '../../components/dashboard/CompletionMeter/CompletionMeter'
import DeptByUnit from '../../components/dashboard/DeptByUnit/DeptByUnit'
import DonutChart from '../../components/charts/DonutChart/DonutChart'
import GroupSplit from '../../components/charts/GroupSplit/GroupSplit'
import styles from './DashboardPage.module.css'

// PALETA DESTA TELA (é a este comentário que DeptByUnit se refere):
//
// A Visão geral fica de fora da paleta --chart-* (constants/chartColors.js),
// que vale nos gráficos de Chamados e de monitoramento. É a primeira tela
// depois do login, a vitrine da marca, e aqui os verdes e laranjas GMAD pesam
// mais que o contraste entre séries. Decisão do dono do produto — não é falta
// de padronização a ser "consertada" depois.
//
// Havia aqui duas listas de cor (MADVILLE_COLORS/CURITIBA_COLORS) para os
// polígonos dos radares de colaboradores. Os radares saíram — ver a
// justificativa em useDashboardData, junto de colaboradoresPorGrupo — e as
// barras que entraram no lugar usam o DEPT_COLORS do próprio DeptByUnit.

export default function DashboardPage() {
  const { data: assets, isLoading, isError } = useAssets()
  const { data: contatos } = useContatos()
  const { user } = useAuth()
  const [dashUnidade, setDashUnidade] = useState('Todas')
  const navigateTo = useNavigateTo()

  const dashboard = useDashboardData(assets ?? [], contatos ?? [], dashUnidade)
  const firstName = greetingName(user?.email)

  // Reavalia o horário a cada minuto — sem isso a saudação só trocaria de
  // período (Bom dia/Boa tarde/Boa noite) no próximo re-render disparado por
  // outra coisa (troca de filtro, foco na aba etc.), podendo ficar
  // desatualizada se a tela ficar parada no fuso do usuário.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(id)
  }, [])

  return (
    <div>
      <div className={styles.greeting}>
        <h1>
          {greetingForHour(now)}, <span className={styles.greetingName}>{firstName}</span>! Vamos
          manter tudo sob controle.
        </h1>
      </div>

      <div className={styles.heading}>
        <div>
          <h2>Visão geral</h2>
          <p>Panorama dos equipamentos de TI</p>
        </div>
        <Dropdown
          label={dashboard.unitDropdownLabel}
          items={dashboard.unitDropdownItems}
          activeValue={dashUnidade}
          onSelect={setDashUnidade}
        />
      </div>

      {isLoading && (
        <div className={styles.state}>
          <Loading label="Carregando ativos..." />
        </div>
      )}

      {isError && (
        <Alert variant="danger">Não foi possível carregar os ativos. Verifique sua conexão.</Alert>
      )}

      {!isLoading && !isError && (
        <>
          <KpiStrip
            inventoryTiles={dashboard.inventoryTiles}
            financeTiles={dashboard.financeTiles}
            onNavigate={navigateTo}
          />

          <div className={styles.grid}>
            <Card
              className={styles.statusCard}
              title="Status geral"
              subtitle="Situação atual do parque de equipamentos"
            >
              <DonutChart key={dashUnidade} {...dashboard.statusChart} />
            </Card>
            <Card
              attn
              title="Requer atenção"
              subtitle="Garantias vencendo e equipamentos em manutenção"
            >
              <MiniStats items={dashboard.miniStats} />
              <AttentionList items={dashboard.attentionList} />
            </Card>
          </div>

          {/* Preço e garantia são opcionais no cadastro, mas sustentam número
              que este painel apresenta como se fosse do parque inteiro — o
              valor investido e o alerta de garantia vencendo. Enquanto a
              lacuna fica invisível, os dois enganam em silêncio; medida de
              frente, ela vira tarefa. O card se resolve sozinho conforme a
              equipe preenche: a 100% os medidores só confirmam que está em
              dia, e a ressalva do KPI some. */}
          <Card
            className={styles.completudeCard}
            title="Completude do cadastro"
            subtitle="O quanto os números acima cobrem do parque"
          >
            <div className={styles.completude}>
              {dashboard.completude.map((medidor) => (
                <CompletionMeter key={medidor.label} {...medidor} />
              ))}
            </div>
          </Card>

          {/* Largura inteira, fora do .grid: são dois blocos lado a lado, cada
              um com uma barra por departamento. Em meia página o rótulo do
              departamento e a barra dividiriam menos de 150px, e os nomes
              longos ("Crédito e Cobrança", "Técnico Iluminação") cortariam. */}
          <Card
            className={styles.unitCard}
            title="Distribuição por unidade"
            subtitle="Colaboradores cadastrados por departamento, por unidade / local"
          >
            <GroupSplit
              madville={dashboard.groupSplit.madville}
              outras={dashboard.groupSplit.outras}
              madvilleBelow={
                <DeptByUnit
                  colunas
                  units={dashboard.colaboradoresPorGrupo.madville}
                  emptyMessage="Nenhuma unidade Madville cadastrada ainda."
                  itemEmptyMessage="Sem colaboradores:"
                />
              }
              outrasBelow={
                <DeptByUnit
                  colunas
                  units={dashboard.colaboradoresPorGrupo.outras}
                  emptyMessage="Nenhuma loja de fora cadastrada ainda."
                  itemEmptyMessage="Sem colaboradores:"
                />
              }
            />
          </Card>

          <Card
            variant="plain"
            className={styles.deptCard}
            title="Distribuição por setor"
            subtitle="Ativos por departamento em cada unidade / loja"
          >
            <DeptByUnit units={dashboard.deptByUnit} />
          </Card>
        </>
      )}
    </div>
  )
}
