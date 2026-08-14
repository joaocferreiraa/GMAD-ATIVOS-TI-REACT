import Modal from '../../ui/Modal/Modal'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import { unitDisplayName } from '../../../utils/formatters'
import { contatoCelularInfo, contatoDeptGestorMap } from '../../../utils/contatosFilter'
import { DEPARTAMENTO_VENDAS, DEPARTAMENTO_ALMOXARIFADO } from '../../../utils/departamentos'
import { useNavigateTo } from '../../../hooks/useNavigateTo'
import { ROUTES } from '../../../constants/routes'
import panelStyles from '../ContatoPanel.module.css'

function ViewRow({ label, value, onClick }) {
  return (
    <div className={panelStyles.viewRow}>
      <div className={panelStyles.vrLabel}>{label}</div>
      {onClick ? (
        <button type="button" className={panelStyles.vrLink} onClick={onClick}>
          {value}
        </button>
      ) : (
        <div className={panelStyles.vrValue}>{value}</div>
      )}
    </div>
  )
}

// Ficha de visualização de um colaborador (openContatoViewModal() do sistema
// original) — somente leitura, uma única coluna (sem cartões/grid como em
// Ativos), com atalho para abrir a edição.
export default function ContatoViewModal({ open, contato, contatos, assets, onClose, onEdit }) {
  const navigateTo = useNavigateTo()
  if (!contato) return null

  const gestorMap = contatoDeptGestorMap(contatos)
  const gestorDoDepto = gestorMap[contato.departamento]
  const celInfo = contatoCelularInfo(assets, contato)

  // Celular vinculado a um ativo cadastrado (ver contatoCelularInfo): leva
  // direto para a ficha daquele dispositivo em Ativos, mesmo mecanismo do
  // sino de notificações/CommandPalette (location.state.openUid).
  function goToCelularAtivo() {
    onClose()
    navigateTo({ route: ROUTES.ativos, state: { openUid: celInfo.uid } })
  }

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
        <div className={panelStyles.viewSectionTitle}>Informações do colaborador</div>
        <div className={panelStyles.viewRows}>
          <ViewRow label="Unidade" value={unitDisplayName(contato.unidade)} />
          <ViewRow label="Departamento" value={contato.departamento} />
          {contato.departamento === DEPARTAMENTO_VENDAS && contato.vendaTipo && (
            <ViewRow label="Tipo de vendedor" value={contato.vendaTipo} />
          )}
          {contato.departamento === DEPARTAMENTO_ALMOXARIFADO && contato.almoxarifadoArea && (
            <ViewRow label="Área do almoxarifado" value={contato.almoxarifadoArea} />
          )}
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
            onClick={celInfo?.fromAtivo ? goToCelularAtivo : undefined}
          />
          {contato.telefone && <ViewRow label="Telefone" value={contato.telefone} />}
          {contato.ramal && <ViewRow label="Ramal" value={contato.ramal} />}
          {contato.email && <ViewRow label="E-mail corporativo" value={contato.email} />}
        </div>
      </div>
    </Modal>
  )
}
