import { useMemo, useState } from 'react'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import { WifiIcon, ServerIcon } from '../../ui/Icon/icons'
import { buildImportCandidates, candidateToMonitorRecord } from '../../../utils/monitoramentoImport'
import styles from './ImportInfraModal.module.css'

const SECTIONS = [
  { origem: 'wifi', title: 'Wi-Fi', icon: WifiIcon },
  { origem: 'construshow', title: 'Construshow', icon: ServerIcon },
]

// Modal de importação: pega os IPs já cadastrados em Infraestrutura
// (Wi-Fi/Construshow) e oferece como pontos monitorados prontos, evitando
// digitar de novo um IP que já existe em outra tela — ver
// utils/monitoramentoImport.js pros detalhes de qual IP vira `host` de cada
// tipo e de como é decidido o que já está "já monitorado" (dedup por
// host). Cada import passa por createMonitor normalmente (mesma
// validação/log/toast de sempre), um de cada vez.
export default function ImportInfraModal({ open, infra, monitores, onClose, onImportOne }) {
  const candidates = useMemo(() => buildImportCandidates(infra, monitores), [infra, monitores])
  const availableKeys = useMemo(
    () => candidates.filter((c) => !c.jaMonitorado).map((c) => c.key),
    [candidates],
  )
  const [selected, setSelected] = useState(() => new Set())
  const [importing, setImporting] = useState(false)

  // Ao abrir, começa com tudo que ainda não foi importado pré-selecionado
  // (o caso comum é "importar tudo que tem"); reaberturas recalculam do
  // zero, já sem o que foi importado na sessão anterior. Ajusta o estado
  // durante o render comparando com a última abertura processada (mesmo
  // padrão de useSinceIso em hooks/data/useMedicoes.js), em vez de
  // useEffect+setState.
  const [selectionInitFor, setSelectionInitFor] = useState(false)
  if (open !== selectionInitFor) {
    setSelectionInitFor(open)
    if (open) setSelected(new Set(availableKeys))
  }

  function toggle(key) {
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function toggleAll() {
    setSelected((s) => (s.size === availableKeys.length ? new Set() : new Set(availableKeys)))
  }

  async function handleImport() {
    const toImport = candidates.filter((c) => selected.has(c.key))
    if (!toImport.length) return
    setImporting(true)
    // onImportOne (createMonitor.mutateAsync) não rejeita em falha de
    // persistência — createCrudMutations já mostra o toast de erro por
    // conta própria e resolve normalmente (só relança em caso de bug
    // inesperado). Aqui só encadeamos um de cada vez pra cada import buscar
    // a lista mais recente antes de gravar, em vez de todos em paralelo
    // partindo da mesma lista desatualizada.
    for (const candidate of toImport) {
      await onImportOne(candidateToMonitorRecord(candidate))
    }
    setImporting(false)
    onClose()
  }

  const hasCandidates = candidates.length > 0

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Importar da Infraestrutura"
      subtitle="Cria pontos monitorados a partir dos IPs já cadastrados em Wi-Fi e Construshow."
      footer={
        <>
          <div />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={handleImport}
              disabled={importing || selected.size === 0}
            >
              {importing ? 'Importando...' : `Importar (${selected.size})`}
            </Button>
          </div>
        </>
      }
    >
      {!hasCandidates ? (
        <p className={styles.empty}>
          Nenhum IP encontrado em Infraestrutura (Wi-Fi/Construshow) pra importar.
        </p>
      ) : (
        <>
          {SECTIONS.map(({ origem, title, icon: Icon }) => {
            const items = candidates.filter((c) => c.origem === origem)
            if (!items.length) return null
            return (
              <div key={origem} className={styles.section}>
                <div className={styles.sectionTitle}>
                  <Icon /> {title}
                </div>
                {items.map((c) => (
                  <label
                    key={c.key}
                    className={`${styles.row} ${c.jaMonitorado ? styles.rowDisabled : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={c.jaMonitorado || selected.has(c.key)}
                      disabled={c.jaMonitorado}
                      onChange={() => toggle(c.key)}
                    />
                    <span className={styles.rowNome}>{c.nome}</span>
                    <span className={styles.rowHost}>{c.host}</span>
                    {c.jaMonitorado && <span className={styles.rowTag}>já monitorado</span>}
                  </label>
                ))}
              </div>
            )
          })}
          {availableKeys.length > 0 && (
            <button type="button" className={styles.selectAll} onClick={toggleAll}>
              {selected.size === availableKeys.length ? 'Desmarcar todos' : 'Selecionar todos'}
            </button>
          )}
        </>
      )}
    </Modal>
  )
}
