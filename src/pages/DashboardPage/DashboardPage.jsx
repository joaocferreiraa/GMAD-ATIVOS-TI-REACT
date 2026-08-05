import { useState } from 'react'
import { useAssets } from '../../hooks/data/useAssets'
import { useDashboardData } from './useDashboardData'
import Card from '../../components/ui/Card/Card'
import Dropdown from '../../components/ui/Dropdown/Dropdown'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import KpiStrip from '../../components/dashboard/KpiStrip/KpiStrip'
import MiniStats from '../../components/dashboard/MiniStats/MiniStats'
import AttentionList from '../../components/dashboard/AttentionList/AttentionList'
import DeptByUnit from '../../components/dashboard/DeptByUnit/DeptByUnit'
import BarChart from '../../components/charts/BarChart/BarChart'
import GroupSplit from '../../components/charts/GroupSplit/GroupSplit'
import styles from './DashboardPage.module.css'

export default function DashboardPage() {
  const { data: assets, isLoading, isError } = useAssets()
  const [dashUnidade, setDashUnidade] = useState('Todas')

  const dashboard = useDashboardData(assets ?? [], dashUnidade)

  return (
    <div>
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
          />

          <div className={styles.grid}>
            <Card
              title="Distribuição por categoria"
              subtitle="Quantidade de ativos por tipo de equipamento"
            >
              <BarChart {...dashboard.categoryChart} />
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
              subtitle="Ativos cadastrados por unidade / local"
            >
              <GroupSplit
                madville={dashboard.groupSplit.madville}
                outras={dashboard.groupSplit.outras}
              />
              <BarChart {...dashboard.unitChart} emptyMessage="Nenhuma unidade cadastrada ainda." />
            </Card>
            <Card title="Status geral" subtitle="Situação atual do parque de equipamentos">
              <BarChart {...dashboard.statusChart} />
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
