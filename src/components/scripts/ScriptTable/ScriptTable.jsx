import Table from '../../ui/Table/Table'
import Button from '../../ui/Button/Button'
import buttonStyles from '../../ui/Button/Button.module.css'
import tableStyles from '../../ui/Table/Table.module.css'
import { StarIcon, DownloadIcon, EditIcon, TrashIcon } from '../../ui/Icon/icons'
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
        <div className={tableStyles.rowActions}>
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
          {s.urlDownload ? (
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
          <Button
            variant="ghost"
            size="sm"
            title="Editar"
            aria-label="Editar"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(s)
            }}
          >
            <EditIcon />
          </Button>
          <Button
            variant="dangerGhost"
            size="sm"
            title="Excluir"
            aria-label="Excluir"
            onClick={(e) => {
              e.stopPropagation()
              onDelete(s)
            }}
          >
            <TrashIcon />
          </Button>
        </div>
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
