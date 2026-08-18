import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import {
  useInventario,
  useInventarioMudancas,
  useSoftwareDoParque,
} from '../../hooks/data/useInventario'
import { useInventarioData } from './useInventarioData'
import { useToast } from '../../hooks/useToast'
import { removeMachine } from '../../services/inventario/inventarioService'
import { queryKeys } from '../../constants/queryKeys'
import { diagnosticarParque } from '../../utils/saudeParque'
import { montarCatalogo } from '../../utils/catalogoSoftware'
import { ROUTES } from '../../constants/routes'
import Button from '../../components/ui/Button/Button'
import TableSkeleton from '../../components/ui/TableSkeleton/TableSkeleton'
import Alert from '../../components/ui/Alert/Alert'
import SummaryBar from '../../components/ui/SummaryBar/SummaryBar'
import ConfirmDialog from '../../components/ui/ConfirmDialog/ConfirmDialog'
import InventarioFilters from '../../components/inventario/InventarioFilters/InventarioFilters'
import InventarioTable from '../../components/inventario/InventarioTable/InventarioTable'
import InventarioViewModal from '../../components/inventario/InventarioViewModal/InventarioViewModal'
import MudancasList from '../../components/inventario/MudancasList/MudancasList'
import SaudeParque from '../../components/inventario/SaudeParque/SaudeParque'
import CatalogoSoftware from '../../components/inventario/CatalogoSoftware/CatalogoSoftware'
import Tabs from '../../components/ui/Tabs/Tabs'
import styles from './InventarioPage.module.css'

const DEFAULT_FILTERS = {
  search: '',
  tipoChassi: '',
  fabricante: '',
  so: '',
  situacao: '',
  acessoRemoto: '',
}

// Inventário do parque: o que cada máquina tem por dentro, coletado pelo
// agente (agent/inventory.js) e atualizado sozinho via Realtime.
//
// Não usa useCrudPanelState (padrão das telas CRUD do projeto) de propósito:
// aqui não há criar nem editar — o conteúdo é coletado, não digitado. Só
// existem ver e remover, então o estado local é menor que a configuração do
// hook genérico.
export default function InventarioPage() {
  const { data: inventario, isLoading, isError, error } = useInventario()
  const { data: mudancas } = useInventarioMudancas()
  const queryClient = useQueryClient()
  const { showToast } = useToast()

  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [aba, setAba] = useState('saude')

  // Só busca a lista completa de software quando a aba está aberta: são
  // ~90 programas por máquina, e carregar isso sempre custaria megabytes
  // para uma tela que talvez nem seja visitada. Declarado depois de `aba`
  // porque depende dela.
  const { data: softwareParque } = useSoftwareDoParque({ enabled: aba === 'software' })
  const [viewingUid, setViewingUid] = useState(null)
  const [pendingRemove, setPendingRemove] = useState(null)

  const list = useMemo(() => inventario ?? [], [inventario])
  const data = useInventarioData(list, filters)
  // Diagnóstico recalculado só quando o inventário muda — não a cada
  // tecla nos filtros.
  const diagnostico = useMemo(() => diagnosticarParque(list), [list])
  const catalogo = useMemo(() => montarCatalogo(softwareParque ?? []), [softwareParque])

  // Deriva do uid em vez de guardar o objeto: assim a ficha aberta mostra o
  // dado novo quando o Realtime traz uma coleta nova daquela máquina, em
  // vez de congelar no snapshot de quando foi aberta.
  const viewingMachine = viewingUid ? list.find((m) => m.machineUid === viewingUid) : null

  function updateFilters(patch) {
    setFilters((f) => ({ ...f, ...patch }))
  }

  async function handleConfirmRemove() {
    const alvo = pendingRemove
    setPendingRemove(null)
    try {
      await removeMachine(alvo.machineUid)
      setViewingUid(null)
      await queryClient.invalidateQueries({ queryKey: queryKeys.inventario })
      showToast(`${alvo.hostname} removida do inventário.`)
    } catch (e) {
      showToast(`Não foi possível remover: ${e.message}`, 'danger')
    }
  }

  return (
    <div>
      <div className={styles.heading}>
        <div>
          <h2>Máquinas detectadas</h2>
          <p>
            O que o agente encontrou em cada máquina do parque: specs reais, acesso remoto e quem
            parou de reportar. O cadastro administrativo (unidade, departamento, responsável) fica
            em Ativos.
          </p>
        </div>
        <div className={styles.actionsRow}>
          {/* Caminho de volta: esta tela não está no menu (é acessada pelo
              botão em Ativos), então sem isto viraria um beco sem saída. */}
          <Button size="sm" as={Link} to={ROUTES.ativos}>
            Voltar para Ativos
          </Button>
        </div>
      </div>

      {!isLoading && !isError && list.length > 0 && <SummaryBar items={data.resumo} />}

      <Tabs
        items={[
          {
            value: 'saude',
            label: 'Precisa de atenção',
            // Só crítico e atenção no contador: oportunidades (HDD, sem
            // acesso remoto) são melhorias, não pendências — inflá-lo com
            // elas faria o número perder o sentido de urgência.
            count: diagnostico.porGravidade.critico + diagnostico.porGravidade.atencao || undefined,
          },
          { value: 'maquinas', label: 'Máquinas', count: list.length },
          { value: 'software', label: 'Software' },
          {
            value: 'mudancas',
            label: 'O que mudou',
            // Só o que pede ação no contador: o total incluiria cada
            // programa instalado e viraria um número grande e inútil.
            count: (mudancas ?? []).filter((m) => m.severidade !== 'info').length || undefined,
          },
        ]}
        value={aba}
        onChange={setAba}
      />

      {aba === 'saude' ? (
        <SaudeParque diagnostico={diagnostico} onAbrirMaquina={setViewingUid} />
      ) : aba === 'software' ? (
        <CatalogoSoftware catalogo={catalogo} onAbrirMaquina={setViewingUid} />
      ) : aba === 'mudancas' ? (
        <MudancasList mudancas={mudancas} />
      ) : (
        <>
          <InventarioFilters
            filters={filters}
            onChange={updateFilters}
            onClear={() => setFilters(DEFAULT_FILTERS)}
            opcoes={data.opcoes}
          />

          {isLoading && <TableSkeleton columns={9} />}

          {isError && (
            <Alert variant="danger">
              Não foi possível carregar o inventário
              {/* A causa mais provável é a migration não ter sido rodada — a
              mensagem do Postgres já diz isso, e repeti-la aqui evita uma
              ida ao console do navegador pra descobrir. */}
              {error?.message ? `: ${error.message}` : '.'} Se a tabela ainda não existe, rode as
              migrations 0008 e 0009 de supabase/migrations/ no SQL Editor do Supabase.
            </Alert>
          )}

          {!isLoading && !isError && (
            <InventarioTable rows={data.rows} onView={(m) => setViewingUid(m.machineUid)} />
          )}
        </>
      )}

      <InventarioViewModal
        open={!!viewingMachine}
        machine={viewingMachine}
        onClose={() => setViewingUid(null)}
        onRemove={setPendingRemove}
      />

      <ConfirmDialog
        open={!!pendingRemove}
        title="Remover máquina do inventário?"
        message={
          pendingRemove
            ? `"${pendingRemove.hostname}" será removida do inventário. Se o agente ainda estiver instalado e rodando nessa máquina, ela voltará a aparecer na próxima coleta.`
            : ''
        }
        confirmLabel="Remover"
        onConfirm={handleConfirmRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  )
}
