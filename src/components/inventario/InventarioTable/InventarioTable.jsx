import Table from '../../ui/Table/Table'
import { COLUMNS } from './columns'

// Tabela do Inventário: clique na linha abre a ficha completa da máquina.
//
// Sem RowActions (Editar/Excluir) na linha, diferente das outras tabelas do
// projeto: aqui não existe "editar" — o conteúdo é coletado pelo agente,
// não digitado, e uma edição manual seria sobrescrita na próxima coleta. A
// remoção (máquina que saiu do parque) fica na ficha, onde há contexto pra
// decidir, em vez de um X ao lado de cada linha da lista.
export default function InventarioTable({ rows, onView }) {
  return (
    <Table
      columns={COLUMNS}
      rows={rows}
      rowKey="machineUid"
      onRowClick={onView}
      emptyTitle="Nenhuma máquina inventariada"
      emptyMessage="Instale o agente de inventário nas máquinas do parque para que elas apareçam aqui. Veja agent/README-INVENTARIO.md."
    />
  )
}
