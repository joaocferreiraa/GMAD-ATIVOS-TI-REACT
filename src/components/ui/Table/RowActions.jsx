import Button from '../Button/Button'
import tableStyles from './Table.module.css'
import { EditIcon, TrashIcon } from '../Icon/icons'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'

// Par de botões Editar/Excluir da coluna de ações — duplicado de forma
// idêntica em AssetTable, StockTable, ContatoTable, InstallerTable e
// ScriptTable, extraído aqui. `children` permite inserir botões extras
// (baixar, favoritar) antes do par, como em Installer/Script.
export default function RowActions({ item, onEdit, onDelete, children }) {
  const bindTooltip = useHoverTooltip()
  return (
    <div className={tableStyles.rowActions}>
      {children}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Editar"
        onClick={(e) => {
          e.stopPropagation()
          onEdit(item)
        }}
        {...bindTooltip('Editar')}
      >
        <EditIcon />
      </Button>
      <Button
        variant="dangerGhost"
        size="sm"
        aria-label="Excluir"
        onClick={(e) => {
          e.stopPropagation()
          onDelete(item)
        }}
        {...bindTooltip('Excluir')}
      >
        <TrashIcon />
      </Button>
    </div>
  )
}
