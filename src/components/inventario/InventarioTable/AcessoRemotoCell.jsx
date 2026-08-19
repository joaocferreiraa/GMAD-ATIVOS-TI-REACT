import Button from '../../ui/Button/Button'
import tableStyles from '../../ui/Table/Table.module.css'
import { linkRustDesk, statusAcessoRemoto } from '../../../utils/acessoRemoto'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'

// Célula "Acesso remoto" da tabela de Inventário. Vive em arquivo próprio, e
// não dentro de columns.jsx, porque precisa ser um componente de verdade: o
// tooltip compartilhado vem de um hook, e hook não pode ser chamado de dentro
// da função de render de uma coluna.
//
// Mesmo <Button as="a"> que as outras três ações "Acessar" do sistema
// (MaquinasSemCadastro, AssetAgentSection, InventarioViewModal) — é a mesma
// ação, e um <a> cru aqui saía sublinhado e sem a aparência de botão.
export default function AcessoRemotoCell({ maquina }) {
  const bindTooltip = useHoverTooltip()
  const acesso = statusAcessoRemoto(maquina)

  if (acesso.estado !== 'pronto') {
    return <span className={tableStyles.muted}>{acesso.rotulo}</span>
  }

  return (
    <Button
      size="sm"
      as="a"
      href={linkRustDesk(maquina.rustdeskId)}
      // stopPropagation: a linha inteira abre a ficha no clique; sem isso,
      // conectar abriria a sessão E a ficha por cima.
      onClick={(e) => e.stopPropagation()}
      {...bindTooltip(`Conectar via RustDesk (ID ${maquina.rustdeskId})`)}
    >
      Acessar
    </Button>
  )
}
