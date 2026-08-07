import { useMemo } from 'react'
import Button from '../../ui/Button/Button'
import { WifiIcon, PlusIcon, EditIcon } from '../../ui/Icon/icons'
import { WIFI_FIELDS } from '../../../constants/infra'
import { groupWifi } from '../../../utils/infraFilter'
import InfraSection from '../InfraSection/InfraSection'
import InfraRow from '../InfraRow/InfraRow'
import styles from '../InfraAccordion.module.css'

// Seção "Wi-Fi" do acordeão de Infraestrutura (infraBuildWifiSection() do
// sistema original) — agrupada por unidade; cada unidade pode ter mais de
// uma rede (abas para trocar qual rede está exibida, seleção só em memória,
// não persistida), com "+ Nova rede" (adiciona e já abre a edição) e
// "Editar" (edita a rede atualmente selecionada).
export default function WifiSection({
  list,
  search,
  openSection,
  onToggle,
  selected,
  onSelectNet,
  onAddWifi,
  onEditWifi,
}) {
  const q = search.trim()
  const groups = useMemo(() => groupWifi(list, search), [list, search])
  const hasMatch = !q || groups.length > 0
  const isOpen = q ? hasMatch : openSection === 'wifi'

  return (
    <InfraSection sectionKey="wifi" title="Wi-Fi" icon={WifiIcon} open={isOpen} onToggle={onToggle}>
      {groups.length === 0 ? (
        <div className={styles.empty}>Nenhum resultado encontrado.</div>
      ) : (
        groups.map(({ unidade, items }) => {
          const storedIdx = selected[unidade]
          const current = items.find((it) => it.idx === storedIdx) || items[0]
          return (
            <div key={unidade} className={styles.unitBlock}>
              <div className={styles.unitName}>
                {unidade}
                <span className={styles.unitActions}>
                  <Button variant="ghost" size="sm" onClick={() => onAddWifi(unidade)}>
                    <PlusIcon /> Nova rede
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => onEditWifi(current.idx)}>
                    <EditIcon /> Editar
                  </Button>
                </span>
              </div>
              {items.length > 1 && (
                <div className={styles.netTabs}>
                  {items.map((it, i) => (
                    <button
                      key={it.idx}
                      type="button"
                      className={`${styles.netTab} ${it.idx === current.idx ? styles.active : ''}`}
                      onClick={() => onSelectNet(unidade, it.idx)}
                    >
                      {it.w.redeNome || `Rede ${i + 1}`}
                    </button>
                  ))}
                </div>
              )}
              <div className={styles.viewRows}>
                {WIFI_FIELDS.map((f) => (
                  <InfraRow
                    key={f.key}
                    label={f.label}
                    value={current.w[f.key]}
                    masked={f.masked}
                  />
                ))}
              </div>
            </div>
          )
        })
      )}
    </InfraSection>
  )
}
