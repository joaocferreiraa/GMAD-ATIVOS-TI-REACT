import Table from '../../ui/Table/Table'
import RowActions from '../../ui/Table/RowActions'
import Button from '../../ui/Button/Button'
import buttonStyles from '../../ui/Button/Button.module.css'
import { DownloadIcon } from '../../ui/Icon/icons'
import { isHttpUrl } from '../../../utils/urlValidation'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import { COLUMNS } from './columns'

// Tabela de Instaladores (#installerTable do sistema original): clique na
// linha abre o drawer de detalhes, botões de ação baixam/editam/excluem
// diretamente.
export default function InstallerTable({ rows, onView, onEdit, onDelete }) {
  const bindTooltip = useHoverTooltip()
  const columns = [
    ...COLUMNS,
    {
      key: 'acoes',
      label: '',
      render: (i) => (
        <RowActions item={i} onEdit={onEdit} onDelete={onDelete}>
          {isHttpUrl(i.urlDownload) ? (
            <a
              href={i.urlDownload}
              target="_blank"
              rel="noopener noreferrer"
              className={`${buttonStyles.btn} ${buttonStyles.ghost} ${buttonStyles.sm}`}
              aria-label="Baixar"
              onClick={(e) => e.stopPropagation()}
              {...bindTooltip('Baixar')}
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
      emptyTitle="Nenhum instalador cadastrado"
      emptyMessage="Cadastre os programas homologados para deixá-los disponíveis para toda a equipe."
    />
  )
}
