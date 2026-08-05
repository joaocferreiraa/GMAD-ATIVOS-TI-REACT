import Modal from '../../ui/Modal/Modal'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import { unitDisplayName } from '../../../utils/formatters'
import { contatoCelularInfo, contatoDeptGestorMap } from '../../../utils/contatosFilter'
import panelStyles from '../ContatoPanel.module.css'

function ViewRow({ label, value }) {
  return (
    <div className={panelStyles.viewRow}>
      <div className={panelStyles.vrLabel}>{label}</div>
      <div className={panelStyles.vrValue}>{value}</div>
    </div>
  )
}

// Ficha de visualização de um colaborador (openContatoViewModal() do sistema
// original) — somente leitura, uma única coluna (sem cartões/grid como em
// Ativos), com atalho para abrir a edição.
export default function ContatoViewModal({ open, contato, contatos, assets, onClose, onEdit }) {
  if (!contato) return null

  const gestorMap = contatoDeptGestorMap(contatos)
  const gestorDoDepto = gestorMap[contato.departamento]
  const celInfo = contatoCelularInfo(assets, contato)

  return (
    <Modal open={open} onClose={onClose} showCloseButton={false} maxWidth="560px">
      <div className={panelStyles.viewHeaderRow}>
        <div>
          <h2 className={panelStyles.viewHeadTitle}>{contato.nome}</h2>
          {contato.isGestor && (
            <div className={panelStyles.viewHeadBadge}>
              <Badge variant="ok">Gestor</Badge>
            </div>
          )}
        </div>
        <Button variant="primary" size="sm" onClick={onEdit}>
          Editar
        </Button>
      </div>

      <div className={panelStyles.viewSection}>
        <div className={panelStyles.viewRows}>
          <ViewRow label="Unidade" value={unitDisplayName(contato.unidade)} />
          <ViewRow label="Departamento" value={contato.departamento} />
          {gestorDoDepto && (
            <ViewRow
              label="Gestor do departamento"
              value={contato.isGestor ? `${contato.nome} (este colaborador)` : gestorDoDepto}
            />
          )}
          <ViewRow
            label="Celular corporativo"
            value={
              celInfo
                ? `${celInfo.texto}${celInfo.patrimonio ? ` (Patrimônio: ${celInfo.patrimonio})` : ''}`
                : 'Não informado'
            }
          />
          {contato.telefone && <ViewRow label="Telefone" value={contato.telefone} />}
          {contato.ramal && <ViewRow label="Ramal" value={contato.ramal} />}
          {contato.email && <ViewRow label="E-mail corporativo" value={contato.email} />}
        </div>
      </div>
    </Modal>
  )
}
