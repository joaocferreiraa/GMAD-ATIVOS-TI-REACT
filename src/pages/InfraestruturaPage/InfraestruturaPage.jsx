import { useMemo, useState } from 'react'
import { useInfra } from '../../hooks/data/useInfra'
import { useInfraMutations } from '../../hooks/data/useInfraMutations'
import Input from '../../components/ui/Input/Input'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import EmptyHint from '../../components/dashboard/EmptyHint/EmptyHint'
import { SearchIcon } from '../../components/ui/Icon/icons'
import UnitCard from '../../components/infraestrutura/UnitCard/UnitCard'
import InfraFormModal from '../../components/infraestrutura/InfraFormModal/InfraFormModal'
import { WIFI_FIELDS, CONSTRUSHOW_FIELDS } from '../../constants/infra'
import { buildInfraByUnit, infraStats } from '../../utils/infraFilter'
import styles from './InfraestruturaPage.module.css'

// Constante de módulo, e não um literal no corpo do componente: um `{}` novo
// a cada render trocaria a identidade de `data` mesmo sem dado nenhum ter
// mudado, e os useMemo abaixo recalculariam sempre.
const INFRA_VAZIA = { construshow: [], wifi: [] }

export default function InfraestruturaPage() {
  const { data: infra, isLoading, isError } = useInfra()
  const { updateConstrushow, updateWifi, addWifiNetwork } = useInfraMutations()

  const [search, setSearch] = useState('')
  const [wifiSelected, setWifiSelected] = useState({})
  const [editing, setEditing] = useState(null) // null | { type: 'construshow'|'wifi', idx }

  const data = useMemo(() => infra ?? INFRA_VAZIA, [infra])

  const unidades = useMemo(() => buildInfraByUnit(data, search), [data, search])
  const stats = useMemo(() => infraStats(data), [data])

  function handleSelectNet(unidade, idx) {
    setWifiSelected((s) => ({ ...s, [unidade]: idx }))
  }

  function handleAddWifi(unidade) {
    addWifiNetwork.mutate(unidade, {
      onSuccess: (newIdx) => {
        setWifiSelected((s) => ({ ...s, [unidade]: newIdx }))
        setEditing({ type: 'wifi', idx: newIdx })
      },
    })
  }

  function closeEditing() {
    setEditing(null)
  }

  function handleSave(record) {
    if (editing.type === 'construshow') {
      updateConstrushow.mutate({ idx: editing.idx, record }, { onSuccess: closeEditing })
    } else {
      updateWifi.mutate({ idx: editing.idx, record }, { onSuccess: closeEditing })
    }
  }

  let modalProps = null
  if (editing?.type === 'construshow') {
    const c = data.construshow[editing.idx]
    modalProps = {
      title: 'Editar Construshow',
      subtitle: c.unidade,
      fields: CONSTRUSHOW_FIELDS.map((f) => ({ ...f, wide: true })),
      values: c,
    }
  } else if (editing?.type === 'wifi') {
    const w = data.wifi[editing.idx]
    modalProps = {
      title: 'Editar Wi-Fi',
      subtitle: w.unidade,
      fields: [
        { key: 'redeNome', label: 'Nome da rede', wide: true },
        ...WIFI_FIELDS.map((f) => ({ ...f, wide: f.key === 'observacoes' })),
      ],
      values: w,
    }
  }

  const buscando = !!search.trim()

  return (
    <div>
      <div className={styles.heading}>
        <h2>Infraestrutura</h2>
        <p>
          Informações técnicas de rede, sistemas e unidades usadas no dia a dia da equipe de TI.
        </p>
      </div>

      {/* Resumo do cadastro INTEIRO (não do resultado da busca): responde "o
          que existe aqui?" antes de qualquer leitura campo a campo. As
          pendências são o número que puxa trabalho — sem ele, um gateway em
          branco só aparece pra quem abre a unidade e lê "Não informado". */}
      {!isLoading && !isError && (
        <div className={styles.stats}>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.unidades}</span>
            <span className={styles.statLabel}>unidades</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statValue}>{stats.redes}</span>
            <span className={styles.statLabel}>redes Wi-Fi</span>
          </div>
          <div className={styles.stat}>
            <span className={`${styles.statValue} ${stats.pendentes ? styles.statAttn : ''}`}>
              {stats.pendentes}
            </span>
            <span className={styles.statLabel}>campos sem preencher</span>
          </div>
        </div>
      )}

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <SearchIcon />
          <Input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por IP, Wi-Fi, Construshow..."
          />
        </div>
      </div>

      {isLoading && (
        <div className={styles.state}>
          <Loading label="Carregando infraestrutura..." />
        </div>
      )}

      {isError && (
        <Alert variant="danger">
          Não foi possível carregar os dados de infraestrutura. Verifique sua conexão.
        </Alert>
      )}

      {!isLoading && !isError && unidades.length === 0 && (
        <EmptyHint>
          {buscando
            ? 'Nenhum resultado encontrado.'
            : 'Nenhuma unidade cadastrada na infraestrutura ainda.'}
        </EmptyHint>
      )}

      {!isLoading && !isError && unidades.length > 0 && (
        <div className={styles.grid}>
          {unidades.map((u) => (
            <UnitCard
              key={u.unidade}
              unidade={u.unidade}
              aceitaWifi={u.aceitaWifi}
              wifi={u.wifi}
              construshow={u.construshow}
              selectedIdx={wifiSelected[u.unidade]}
              onSelectNet={handleSelectNet}
              onAddWifi={handleAddWifi}
              onEditWifi={(idx) => setEditing({ type: 'wifi', idx })}
              onEditConstrushow={(idx) => setEditing({ type: 'construshow', idx })}
            />
          ))}
        </div>
      )}

      {modalProps && (
        <InfraFormModal
          open={!!editing}
          title={modalProps.title}
          subtitle={modalProps.subtitle}
          fields={modalProps.fields}
          values={modalProps.values}
          onClose={closeEditing}
          onSave={handleSave}
        />
      )}
    </div>
  )
}
