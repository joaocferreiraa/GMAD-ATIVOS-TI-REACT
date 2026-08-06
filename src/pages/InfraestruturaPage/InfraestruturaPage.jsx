import { useState } from 'react'
import { useInfra } from '../../hooks/data/useInfra'
import { useInfraMutations } from '../../hooks/data/useInfraMutations'
import Input from '../../components/ui/Input/Input'
import Card from '../../components/ui/Card/Card'
import Loading from '../../components/ui/Loading/Loading'
import Alert from '../../components/ui/Alert/Alert'
import { SearchIcon } from '../../components/ui/Icon/icons'
import WifiSection from '../../components/infraestrutura/WifiSection/WifiSection'
import ConstrushowSection from '../../components/infraestrutura/ConstrushowSection/ConstrushowSection'
import InfraFormModal from '../../components/infraestrutura/InfraFormModal/InfraFormModal'
import { WIFI_FIELDS, CONSTRUSHOW_FIELDS } from '../../constants/infra'
import styles from './InfraestruturaPage.module.css'

export default function InfraestruturaPage() {
  const { data: infra, isLoading, isError } = useInfra()
  const { updateConstrushow, updateWifi, addWifiNetwork } = useInfraMutations()

  const [search, setSearch] = useState('')
  const [openSection, setOpenSection] = useState(null)
  const [wifiSelected, setWifiSelected] = useState({})
  const [editing, setEditing] = useState(null) // null | { type: 'construshow'|'wifi', idx }

  const data = infra ?? { construshow: [], wifi: [] }

  function handleToggleSection(key) {
    if (search.trim()) return
    setOpenSection((cur) => (cur === key ? null : key))
  }

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

  return (
    <div>
      <div className={styles.heading}>
        <h2>Infraestrutura</h2>
        <p>
          Informações técnicas de rede, sistemas e unidades usadas no dia a dia da equipe de TI.
        </p>
      </div>

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

      {!isLoading && !isError && (
        <Card variant="plain">
          <div className={styles.accordion}>
            <WifiSection
              list={data.wifi}
              search={search}
              openSection={openSection}
              onToggle={handleToggleSection}
              selected={wifiSelected}
              onSelectNet={handleSelectNet}
              onAddWifi={handleAddWifi}
              onEditWifi={(idx) => setEditing({ type: 'wifi', idx })}
            />
            <ConstrushowSection
              list={data.construshow}
              search={search}
              openSection={openSection}
              onToggle={handleToggleSection}
              onEdit={(idx) => setEditing({ type: 'construshow', idx })}
            />
          </div>
        </Card>
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
