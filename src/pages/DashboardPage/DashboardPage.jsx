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
import RadarChart from '../../components/charts/RadarChart/RadarChart'
import styles from './DashboardPage.module.css'

// Cores dos POLÍGONOS de cada radar — um por unidade dentro do grupo, não
// por departamento (no radar o departamento é eixo da teia, não cor). Por
// isso são listas curtas: Madville tem 3 unidades próprias e Curitiba, uma.
//
// A PRIMEIRA cor de cada lista casa com a barra colorida do bloco de número
// logo acima (verde no Madville, laranja no Curitiba) — é o que amarra cada
// teia ao seu cabeçalho quando os dois gráficos ficam lado a lado. As
// seguintes fogem do matiz da primeira de propósito: três verdes seguidos
// dentro do mesmo radar seriam três polígonos indistinguíveis.
//
// Esta tela fica de fora da paleta --chart-* (constants/chartColors.js), que
// vale nos gráficos de Chamados e de monitoramento: a Visão geral é a
// primeira tela depois do login, a vitrine da marca, e aqui os verdes e
// laranjas GMAD pesam mais que o contraste entre séries. Decisão do dono do
// produto — não é falta de padronização a ser "consertada" depois.
const MADVILLE_COLORS = ['var(--verde-700)', 'var(--info)', 'var(--madeira)', 'var(--indigo)']
const CURITIBA_COLORS = ['var(--laranja)', 'var(--yellow)', 'var(--madeira)']

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
            <Card title="Status geral" subtitle="Situação atual do parque de equipamentos">
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

          {/* Largura inteira, fora do .grid: são dois radares lado a lado, e
              os rótulos de categoria ficam na borda externa de cada teia. Em
              meia página eles se atropelariam. */}
          <Card
            className={styles.unitCard}
            title="Distribuição por unidade"
            subtitle="Colaboradores cadastrados por departamento, por unidade / local"
          >
            <GroupSplit
              madville={dashboard.groupSplit.madville}
              outras={dashboard.groupSplit.outras}
              madvilleBelow={
                <RadarChart
                  units={dashboard.colaboradoresRadar.madville}
                  categories={dashboard.colaboradoresRadar.eixos}
                  domainMax={dashboard.colaboradoresRadar.max}
                  colors={MADVILLE_COLORS}
                  emptyMessage="Nenhum colaborador cadastrado nas unidades Madville."
                />
              }
              outrasBelow={
                <RadarChart
                  units={dashboard.colaboradoresRadar.outras}
                  categories={dashboard.colaboradoresRadar.eixos}
                  domainMax={dashboard.colaboradoresRadar.max}
                  colors={CURITIBA_COLORS}
                  emptyMessage="Ainda sem colaboradores cadastrados — a teia se preenche conforme forem entrando."
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
