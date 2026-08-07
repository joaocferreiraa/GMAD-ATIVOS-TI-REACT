import Drawer from '../../ui/Drawer/Drawer'
import Badge from '../../ui/Badge/Badge'
import Button from '../../ui/Button/Button'
import ViewRow from '../../ui/ViewRow/ViewRow'
import buttonStyles from '../../ui/Button/Button.module.css'
import TagChip from '../../ui/TagChip/TagChip'
import CodeBlock from '../../ui/CodeBlock/CodeBlock'
import {
  StarIcon,
  PlayIcon,
  CopyIcon,
  DownloadIcon,
  EditIcon,
  TrashIcon,
} from '../../ui/Icon/icons'
import { useToast } from '../../../hooks/useToast'
import { fmtDate } from '../../../utils/formatters'
import { scriptNew } from '../../../utils/scriptFilter'
import panelStyles from '../ScriptPanel.module.css'

// Painel de detalhes de um script (openScriptDrawer() do sistema original)
// — drawer lateral (largo), somente leitura, com favoritar, copiar
// código/comando, baixar (registra o download) e editar/excluir.
export default function ScriptDrawer({
  open,
  item,
  onClose,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDownload,
}) {
  const { showToast } = useToast()
  if (!item) return null

  const isNew = scriptNew(item.dataCriacao)

  async function handleCopyCmd() {
    try {
      await navigator.clipboard.writeText(item.urlDownload)
      showToast('Comando copiado.')
    } catch {
      showToast('Não foi possível copiar.', 'danger')
    }
  }

  async function handleCopyCode() {
    try {
      await navigator.clipboard.writeText(item.codigo)
      showToast('Código copiado.')
    } catch {
      showToast('Não foi possível copiar o código.', 'danger')
    }
  }

  function handleRun() {
    showToast('Execução remota ainda não está disponível — estrutura preparada para uso futuro.')
  }

  return (
    <Drawer open={open} onClose={onClose} wide>
      <div className={panelStyles.viewHeaderRow}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <button
            type="button"
            className={`${panelStyles.favBtn} ${item.favorito ? panelStyles.active : ''}`}
            title={item.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
            onClick={() => onToggleFavorite(item.uid)}
          >
            <StarIcon />
          </button>
          <div>
            <h2 className={panelStyles.viewHeadTitle}>{item.nome}</h2>
            <div className={panelStyles.viewHeadSub}>{item.categoria}</div>
          </div>
        </div>
      </div>

      {item.descricao && (
        <div className={panelStyles.viewSection}>
          <div className={panelStyles.viewSectionTitle}>Descrição</div>
          <div className={panelStyles.viewRows}>
            <ViewRow raw value={item.descricao} />
          </div>
        </div>
      )}

      <div className={panelStyles.viewSection}>
        <div className={panelStyles.viewRows}>
          <ViewRow label="Categoria" value={item.categoria} />
          <ViewRow label="Tipo" value={item.tipo} />
          <ViewRow
            label="Extensão"
            raw
            value={<TagChip>.{(item.extensao || item.tipo || '').replace(/^\./, '')}</TagChip>}
          />
          <ViewRow label="Versão" value={item.versao} />
          <ViewRow label="Autor" value={item.autor} />
          <ViewRow label="Tamanho" value={item.tamanho} />
          <ViewRow
            label="Data de criação"
            raw
            value={
              <>
                {item.dataCriacao ? fmtDate(item.dataCriacao) : 'Não informado'}
                {isNew && (
                  <>
                    {' '}
                    <Badge variant="ok">Novo</Badge>
                  </>
                )}
              </>
            }
          />
          <ViewRow
            label="Última atualização"
            raw
            value={item.dataAtualizacao ? fmtDate(item.dataAtualizacao) : 'Não informado'}
          />
          <ViewRow label="Downloads" value={String(item.downloads || 0)} />
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

      {item.codigo && (
        <div className={panelStyles.viewSection}>
          <div className={panelStyles.viewSectionTitle}>Código</div>
          <CodeBlock code={item.codigo} tipo={item.tipo} />
          <div className={panelStyles.codeActions}>
            <Button size="sm" onClick={handleCopyCode}>
              <CopyIcon /> Copiar código
            </Button>
          </div>
        </div>
      )}

      <div className={panelStyles.footer}>
        <div />
        <div className={panelStyles.footerActions}>
          <Button variant="ghost" size="sm" onClick={handleRun} title="Preparado para uso futuro">
            <PlayIcon /> Executar
          </Button>
          {item.urlDownload && (
            <Button size="sm" onClick={handleCopyCmd}>
              <CopyIcon /> Copiar comando
            </Button>
          )}
          {item.urlDownload ? (
            <a
              href={item.urlDownload}
              target="_blank"
              rel="noopener"
              className={`${buttonStyles.btn} ${buttonStyles.primary} ${buttonStyles.sm}`}
              onClick={() => onDownload(item.uid)}
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
          <Button variant="dangerGhost" size="sm" onClick={onDelete}>
            <TrashIcon />
          </Button>
        </div>
      </div>
    </Drawer>
  )
}
