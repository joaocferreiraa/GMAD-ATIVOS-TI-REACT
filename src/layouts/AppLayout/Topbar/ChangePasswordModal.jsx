import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '../../../hooks/auth/useAuth'
import { useToast } from '../../../hooks/useToast'
import Modal from '../../../components/ui/Modal/Modal'
import FormField, { FormGrid } from '../../../components/ui/FormField/FormField'
import Input from '../../../components/ui/Input/Input'
import Button from '../../../components/ui/Button/Button'
import styles from './ChangePasswordModal.module.css'

// Sem regra de tamanho aqui: os campos só precisam estar preenchidos. Quem
// define política de senha é o projeto no Supabase, e ele recusa o que não
// atende devolvendo a razão — que este formulário mostra (ver onSubmit).
// Duplicar a regra no cliente criaria duas fontes de verdade que divergem no
// dia em que a política mudar lá.
const schema = z
  .object({
    atual: z.string().min(1, 'Informe a senha atual.'),
    nova: z.string().min(1, 'Informe a nova senha.'),
    confirmacao: z.string().min(1, 'Repita a nova senha.'),
  })
  // Os dois refinamentos abaixo são de RELAÇÃO entre campos, por isso vivem
  // aqui e não no min() de cada um.
  .refine((v) => v.nova === v.confirmacao, {
    path: ['confirmacao'],
    message: 'As senhas não conferem.',
  })
  .refine((v) => v.nova !== v.atual, {
    path: ['nova'],
    message: 'A nova senha precisa ser diferente da atual.',
  })

// Troca de senha do próprio usuário. Não existia caminho nenhum pra isso no
// sistema — dependia de um admin abrir o painel do Supabase.
//
// CONFERE A SENHA ATUAL ANTES DE TROCAR, e essa é a parte que importa: o
// supabase.auth.updateUser() troca a senha só com a sessão válida, sem pedir
// a antiga. Num painel que fica aberto o dia todo em estação compartilhada,
// isso deixaria qualquer um trocar a senha de quem esqueceu a tela destravada
// e trancar o dono para fora.
//
// Como o Supabase não tem "verifique esta senha", a conferência é um
// signIn do próprio usuário com a senha digitada. Isso emite uma sessão nova
// pro MESMO usuário (sem redirecionamento nem troca de identidade), e um erro
// ali não derruba a sessão em curso — só devolve o erro.
export default function ChangePasswordModal({ open, onClose }) {
  const { user, signIn, updatePassword } = useAuth()
  const { showToast } = useToast()
  const [salvando, setSalvando] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { atual: '', nova: '', confirmacao: '' },
  })

  // O erro de servidor vive no próprio formulário (errors.root), não num
  // useState à parte: assim o reset() abaixo limpa campos e erro numa
  // chamada só — e o efeito não precisa de setState, que a regra
  // react-hooks/set-state-in-effect proíbe por causar render em cascata.
  const erro = errors.root?.message

  // Limpa ao abrir, e não ao fechar: fechar-e-reabrir precisa vir em branco,
  // e limpar na saída deixaria os campos piscando vazios durante o
  // fechamento do overlay.
  useEffect(() => {
    if (open) reset({ atual: '', nova: '', confirmacao: '' })
  }, [open, reset])

  async function onSubmit(values) {
    setSalvando(true)

    // Passa o e-mail completo: buildLoginEmail deixa passar valor que já tem
    // "@" (ver utils/loginEmail), então serve tanto pro login curto quanto
    // pro endereço inteiro que a sessão guarda.
    const { error: erroAtual } = await signIn(user?.email, values.atual)
    if (erroAtual) {
      setError('root', { message: 'A senha atual está incorreta.' })
      setSalvando(false)
      return
    }

    const { error: erroTroca } = await updatePassword(values.nova)
    if (erroTroca) {
      // Mensagem do próprio Supabase quando existe: ela carrega a regra que
      // o projeto configurou (tamanho mínimo, senha vazada, etc), que este
      // formulário não tem como conhecer.
      setError('root', {
        message: erroTroca.message || 'Não foi possível trocar a senha. Tente de novo.',
      })
      setSalvando(false)
      return
    }

    setSalvando(false)
    onClose()
    showToast('Senha alterada. Ela já vale para o próximo acesso.')
  }

  const submit = handleSubmit(onSubmit)

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Trocar senha"
      subtitle={user?.email}
      maxWidth={420}
      footer={
        <div className={styles.acoes}>
          <Button onClick={onClose} disabled={salvando}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit} disabled={salvando}>
            {salvando ? 'Salvando...' : 'Trocar senha'}
          </Button>
        </div>
      }
    >
      {/* onSubmit no <form> além do botão: sem ele, Enter dentro de um campo
          não envia, e formulário de senha é digitado quase sempre no teclado. */}
      <form onSubmit={submit} noValidate>
        <FormGrid>
          <FormField label="Senha atual" htmlFor="cp_atual" full error={errors.atual?.message}>
            <Input
              id="cp_atual"
              type="password"
              autoComplete="current-password"
              {...register('atual')}
            />
          </FormField>

          <FormField label="Nova senha" htmlFor="cp_nova" full error={errors.nova?.message}>
            <Input id="cp_nova" type="password" autoComplete="new-password" {...register('nova')} />
          </FormField>

          <FormField
            label="Repita a nova senha"
            htmlFor="cp_confirmacao"
            full
            error={errors.confirmacao?.message}
          >
            <Input
              id="cp_confirmacao"
              type="password"
              autoComplete="new-password"
              {...register('confirmacao')}
            />
          </FormField>
        </FormGrid>

        {erro && <p className={styles.erro}>{erro}</p>}

        {/* Submit escondido: é ele que faz o Enter enviar o formulário. O
            botão visível vive no rodapé do Modal, fora do <form>. */}
        <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
      </form>
    </Modal>
  )
}
