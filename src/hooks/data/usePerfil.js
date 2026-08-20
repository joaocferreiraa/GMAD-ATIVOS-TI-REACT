import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../auth/useAuth'
import { getFotosPerfil, salvarFotoPerfil } from '../../services/perfil/perfilService'
import { queryKeys } from '../../constants/queryKeys'

// Perfil do usuário logado, juntando as DUAS fontes que ele tem:
//
//  - setor e cargo vêm do user_metadata, que já chega na sessão (nenhuma
//    requisição extra, disponível no primeiro quadro);
//  - a foto vem do kv_store, porque metadata viaja dentro do JWT e imagem ali
//    engordaria toda requisição do app (ver perfilService).
//
// A separação é do armazenamento, não da interface: quem consome recebe um
// objeto só e não precisa saber de onde cada campo veio.
export function usePerfil() {
  const { user } = useAuth()
  const email = user?.email

  const { data: fotos } = useQuery({
    queryKey: queryKeys.perfilFotos,
    queryFn: getFotosPerfil,
    // Foto de perfil muda raríssimo; o padrão de 30s faria o app rebuscar o
    // mapa a cada troca de aba sem nada ter mudado.
    staleTime: 10 * 60_000,
  })

  return {
    email,
    foto: email ? (fotos?.[email] ?? null) : null,
    setor: user?.user_metadata?.setor ?? '',
    cargo: user?.user_metadata?.cargo ?? '',
  }
}

export function useSalvarFotoPerfil() {
  const queryClient = useQueryClient()
  const { user } = useAuth()

  return useMutation({
    mutationFn: (dataUrl) => salvarFotoPerfil(user?.email, dataUrl),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.perfilFotos }),
  })
}
