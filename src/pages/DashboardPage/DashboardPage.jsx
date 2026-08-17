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
import DeptByUnit from '../../components/dashboard/DeptByUnit/DeptByUnit'
import CompletionMeter from '../../components/dashboard/CompletionMeter/CompletionMeter'
import DonutChart from '../../components/charts/DonutChart/DonutChart'
import GroupSplit from '../../components/charts/GroupSplit/GroupSplit'
import StackedBarChart from '../../components/charts/StackedBarChart/StackedBarChart'
import styles from './DashboardPage.module.css'

// Paleta pro StackedBarChart de colaboradores por departamento — mais ampla
// que as outras (10 cores) porque o número de departamentos reais costuma
// passar disso; repetição de cor é esperada, o hover sempre mostra o nome
// exato do departamento. --info/--yellow/--indigo por último (mesmos tons
// usados em tiles/badges pelo site) só pra dar mais tons bem distintos antes
// de repetir.
const DEPARTMENT_COLORS = [
  'var(--verde-700)',
  'var(--laranja)',
  'var(--verde-600)',
  'var(--verde-900)',
  'var(--laranja-forte)',
  'var(--verde-800)',
  'var(--madeira)',
  'var(--info)',
  'var(--yellow)',
  'var(--indigo)',
]

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

          <div className={styles.grid}>
            <Card
              title="Distribuição por unidade"
              subtitle="Colaboradores cadastrados por departamento, por unidade / local"
            >
              <GroupSplit
                madville={dashboard.groupSplit.madville}
                outras={dashboard.groupSplit.outras}
              />
              <StackedBarChart
                units={dashboard.colaboradoresByDept}
                colors={DEPARTMENT_COLORS}
                emptyMessage="Nenhum colaborador cadastrado ainda."
              />
            </Card>
            <Card title="Idade do parque" subtitle="Cadastro de data de aquisição dos equipamentos">
              <CompletionMeter
                label="dos ativos com data de aquisição cadastrada"
                filled={dashboard.ageCompleteness.filled}
                total={dashboard.ageCompleteness.total}
                missingLabel="ainda sem data cadastrada"
              />
            </Card>
          </div>

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
