import Drawer from '../../ui/Drawer/Drawer'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import ViewRow from '../../ui/ViewRow/ViewRow'
import buttonStyles from '../../ui/Button/Button.module.css'
import { CopyIcon, DownloadIcon, EditIcon } from '../../ui/Icon/icons'
import { useToast } from '../../../hooks/useToast'
import { fmtDate } from '../../../utils/formatters'
import { installerRecent } from '../../../utils/installerFilter'
import { isHttpUrl } from '../../../utils/urlValidation'
import panelStyles from '../InstallerPanel.module.css'
import InstallerAvatar from '../InstallerAvatar/InstallerAvatar'

// Painel de detalhes de um instalador (openInstallerDrawer() do sistema
// original) — drawer lateral, somente leitura, com atalho para edição.
export default function InstallerDrawer({ open, item, onClose, onEdit }) {
  const { showToast } = useToast()
  if (!item) return null

  const recent = installerRecent(item.dataAtualizacao)

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(item.urlDownload)
      showToast('Link copiado.')
    } catch {
      showToast('Não foi possível copiar o link.', 'danger')
    }
  }

  return (
    <Drawer open={open} onClose={onClose}>
      <div className={panelStyles.viewHeaderRow}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <InstallerAvatar nome={item.nome} size="lg" />
          <div>
            <h2 className={panelStyles.viewHeadTitle}>{item.nome}</h2>
            <div className={panelStyles.viewHeadSub}>{item.categoria}</div>
          </div>
        </div>
      </div>

      <div className={panelStyles.viewSection}>
        <div className={panelStyles.viewRows}>
          <ViewRow label="Desenvolvedor" value={item.desenvolvedor} />
          <ViewRow label="Versão" value={item.versao} />
          <ViewRow label="Arquitetura" value={item.arquitetura} />
          <ViewRow label="Tamanho" value={item.tamanho} />
          <ViewRow label="Categoria" value={item.categoria} />
          <ViewRow
            label="Última atualização"
            raw
            value={
              <span className={panelStyles.vrValueBadgeGroup}>
                {item.dataAtualizacao ? fmtDate(item.dataAtualizacao) : 'Não informado'}
                {recent && <Badge variant="ok">Recente</Badge>}
              </span>
            }
          />
        </div>
      </div>

      {item.observacoes && (
        <div className={panelStyles.viewSection}>
          <div className={panelStyles.viewSectionTitle}>Observações</div>
          <div className={panelStyles.viewRows}>
            <ViewRow raw value={item.observacoes} />
          </div>
        </div>
      )}

      <div className={panelStyles.footer}>
        <div />
        <div className={panelStyles.footerActions}>
          {item.urlDownload && (
            <Button size="sm" onClick={handleCopyLink}>
              <CopyIcon /> Copiar link
            </Button>
          )}
          {isHttpUrl(item.urlDownload) ? (
            <a
              href={item.urlDownload}
              target="_blank"
              rel="noopener"
              className={`${buttonStyles.btn} ${buttonStyles.primary} ${buttonStyles.sm}`}
            >
              <DownloadIcon /> Baixar
            </a>
          ) : (
            <Button size="sm" disabled title="Sem link cadastrado">
              <DownloadIcon /> Baixar
            </Button>
          )}
          <Button size="sm" onClick={onEdit}>
            <EditIcon /> Editar
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
