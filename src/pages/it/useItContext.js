import { useMemo } from 'react'
import { useAuth } from '../../hooks/auth/useAuth'
import { useToast } from '../../hooks/useToast'

// Adaptadores entre as telas de TI (que vieram de outro projeto e esperam
// `useData()` / `useToast()` com uma forma específica) e os contextos desta
// plataforma (AuthProvider do Supabase e ToastProvider).
//
// Manter a tradução aqui, num arquivo só, evita espalhar `useAuth()` por
// dentro das telas — se um dia elas forem substituídas ou atualizadas a
// partir do projeto de origem, este é o único ponto de contato.

// Quem é da equipe de TI. Como esta plataforma inteira é do setor de TI,
// todo usuário autenticado é tratado como técnico — ajuste aqui se um dia
// usuários de outros setores passarem a abrir chamados por ela.
const PAPEL_PADRAO = 'ti'

export function useData() {
  const { user } = useAuth()

  return useMemo(() => {
    const email = user?.email ?? ''
    // O Supabase Auth guarda o nome em user_metadata quando o cadastro o
    // preenche; sem isso, o trecho antes do @ é o melhor identificador legível.
    const nome = user?.user_metadata?.full_name || user?.user_metadata?.name || email.split('@')[0]

    return {
      username: email,
      name: nome,
      userRole: PAPEL_PADRAO,
      group: 'TI',
      jobTitle: '',
      // Lista para o seletor de responsável. A plataforma não expõe os
      // usuários do Supabase Auth pelo cliente (precisaria da service_role
      // key), então por ora só o próprio usuário aparece — suficiente para
      // "assumir chamado", que é a ação mais usada.
      users: email ? [{ username: email, name: nome }] : [],
    }
  }, [user])
}

export function useItToast() {
  const { showToast } = useToast()

  return useMemo(
    () => ({
      // As telas chamam toast.error('Título', 'detalhe'); o provider daqui
      // recebe (mensagem, variante). Juntamos os dois numa linha só.
      success: (titulo, detalhe) => showToast(detalhe ? `${titulo}: ${detalhe}` : titulo),
      error: (titulo, detalhe) => showToast(detalhe ? `${titulo}: ${detalhe}` : titulo, 'danger'),
      warning: (titulo, detalhe) => showToast(detalhe ? `${titulo}: ${detalhe}` : titulo, 'warning'),
      info: (titulo, detalhe) => showToast(detalhe ? `${titulo}: ${detalhe}` : titulo),
    }),
    [showToast],
  )
}
