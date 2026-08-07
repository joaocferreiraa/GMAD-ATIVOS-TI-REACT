import Button from '../Button/Button'
import tableStyles from './Table.module.css'
import { EditIcon, TrashIcon } from '../Icon/icons'

// Par de botões Editar/Excluir da coluna de ações — duplicado de forma
// idêntica em AssetTable, StockTable, ContatoTable, InstallerTable e
// ScriptTable, extraído aqui. `children` permite inserir botões extras
// (baixar, favoritar) antes do par, como em Installer/Script.
export default function RowActions({ item, onEdit, onDelete, children }) {
  return (
    <div className={tableStyles.rowActions}>
      {children}
      <Button
        variant="ghost"
        size="sm"
        title="Editar"
        aria-label="Editar"
        onClick={(e) => {
          e.stopPropagation()
          onEdit(item)
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
          onDelete(item)
        }}
      >
        <TrashIcon />
      </Button>
    </div>
  )
}
