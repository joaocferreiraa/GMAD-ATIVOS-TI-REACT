import { useNavigate } from 'react-router-dom'

// Fachada fina sobre navigate() pro contrato `to: { route, state }` usado
// por notificações da Topbar, cards do Dashboard, links entre fichas
// (Contato -> Ativo vinculado) e a paleta de busca — um único lugar pra
// mudar esse contrato (ex: adicionar `replace: true`) em vez de reescrever
// `navigate(to.route, { state: to.state })` em cada consumidor.
export function useNavigateTo() {
  const navigate = useNavigate()
  return (to) => navigate(to.route, { state: to.state })
}
