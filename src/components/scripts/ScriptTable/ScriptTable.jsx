import Table from '../../ui/Table/Table'
import RowActions from '../../ui/Table/RowActions'
import Button from '../../ui/Button/Button'
import buttonStyles from '../../ui/Button/Button.module.css'
import { StarIcon, DownloadIcon } from '../../ui/Icon/icons'
import { isHttpUrl } from '../../../utils/urlValidation'
import panelStyles from '../ScriptPanel.module.css'
import { COLUMNS } from './columns'

// Tabela de Scripts (#scriptTable do sistema original): clique na linha
// abre o drawer de detalhes, botões de ação favoritam/baixam/editam/excluem
// diretamente.
export default function ScriptTable({
  rows,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDownload,
}) {
  const columns = [
    ...COLUMNS,
    {
      key: 'acoes',
      label: '',
      render: (s) => (
        <RowActions item={s} onEdit={onEdit} onDelete={onDelete}>
          <button
            type="button"
            className={`${panelStyles.favBtn} ${s.favorito ? panelStyles.active : ''}`}
            title={s.favorito ? 'Remover dos favoritos' : 'Marcar como favorito'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite(s.uid)
            }}
          >
            <StarIcon />
          </button>
          {isHttpUrl(s.urlDownload) ? (
            <a
              href={s.urlDownload}
              target="_blank"
              rel="noopener"
              className={`${buttonStyles.btn} ${buttonStyles.ghost} ${buttonStyles.sm}`}
              title="Baixar"
              aria-label="Baixar"
              onClick={(e) => {
                e.stopPropagation()
                onDownload(s.uid)
              }}
            >
              <DownloadIcon />
            </a>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled
              title="Sem link cadastrado"
              aria-label="Baixar"
            >
              <DownloadIcon />
            </Button>
          )}
        </RowActions>
      ),
    },
  ]

  return (
    <Table
      columns={columns}
      rows={rows}
      rowKey="uid"
      onRowClick={onView}
      emptyTitle="Nenhum script cadastrado"
      emptyMessage="Cadastre os scripts e automações usados pela equipe de TI."
    />
  )
}
