import Button from '../../ui/Button/Button'
import { ServerIcon, EditIcon } from '../../ui/Icon/icons'
import { CONSTRUSHOW_FIELDS } from '../../../constants/infra'
import { filterConstrushow } from '../../../utils/infraFilter'
import InfraSection from '../InfraSection/InfraSection'
import InfraRow from '../InfraRow/InfraRow'
import styles from '../InfraAccordion.module.css'

// Seção "Construshow" do acordeão de Infraestrutura
// (infraBuildConstrushowSection() do sistema original) — lista fixa de 2
// unidades, somente edição (sem adicionar/excluir).
export default function ConstrushowSection({ list, search, openSection, onToggle, onEdit }) {
  const q = search.trim()
  const blocks = filterConstrushow(list, search)
  const hasMatch = !q || blocks.length > 0
  const isOpen = q ? hasMatch : openSection === 'construshow'

  return (
    <InfraSection
      sectionKey="construshow"
      title="Construshow"
      icon={ServerIcon}
      open={isOpen}
      onToggle={onToggle}
    >
      {blocks.length === 0 ? (
        <div className={styles.empty}>Nenhum resultado encontrado.</div>
      ) : (
        blocks.map(({ c, idx }) => (
          <div key={idx} className={styles.unitBlock}>
            <div className={styles.unitName}>
              {c.unidade}
              <span className={styles.unitActions}>
                <Button variant="ghost" size="sm" onClick={() => onEdit(idx)}>
                  <EditIcon /> Editar
                </Button>
              </span>
            </div>
            <div className={styles.viewRows}>
              {CONSTRUSHOW_FIELDS.map((f) => (
                <InfraRow key={f.key} label={f.label} value={c[f.key]} />
              ))}
            </div>
          </div>
        ))
      )}
    </InfraSection>
  )
}
