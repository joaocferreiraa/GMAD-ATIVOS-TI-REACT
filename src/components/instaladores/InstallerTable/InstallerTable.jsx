import Table from '../../ui/Table/Table'
import Button from '../../ui/Button/Button'
import buttonStyles from '../../ui/Button/Button.module.css'
import tableStyles from '../../ui/Table/Table.module.css'
import { DownloadIcon, EditIcon, TrashIcon } from '../../ui/Icon/icons'
import { COLUMNS } from './columns'

// Tabela de Instaladores (#installerTable do sistema original): clique na
// linha abre o drawer de detalhes, botões de ação baixam/editam/excluem
// diretamente.
export default function InstallerTable({ rows, onView, onEdit, onDelete }) {
  const columns = [
    ...COLUMNS,
    {
      key: 'acoes',
      label: '',
      render: (i) => (
        <div className={tableStyles.rowActions}>
          {i.urlDownload ? (
            <a
              href={i.urlDownload}
              target="_blank"
              rel="noopener"
              className={`${buttonStyles.btn} ${buttonStyles.ghost} ${buttonStyles.sm}`}
              title="Baixar"
              aria-label="Baixar"
              onClick={(e) => e.stopPropagation()}
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
              onEdit(i)
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
              onDelete(i)
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
      emptyTitle="Nenhum instalador cadastrado"
      emptyMessage="Cadastre os programas homologados para deixá-los disponíveis para toda a equipe."
    />
  )
}
