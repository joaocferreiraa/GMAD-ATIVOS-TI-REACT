import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/auth/useAuth'
import { useHoverTooltip } from '../../hooks/overlay/useHoverTooltip'
import { ROUTES } from '../../constants/routes'
import { EyeIcon, EyeOffIcon, LoginIcon, SpinnerIcon } from '../../components/ui/Icon/icons'
import loginBackground from '../../assets/images/login-background.jpg'
import styles from './LoginPage.module.css'

const REMEMBER_KEY = 'gmad_remembered_user'

// Sem .min(1): a checagem de campos vazios replica a mensagem única do
// sistema original ("Preencha usuário e senha."), não erros por campo.
const loginSchema = z.object({
  usuario: z.string(),
  senha: z.string(),
  lembrar: z.boolean(),
})

export default function LoginPage() {
  const { signIn, isAuthenticated, isSupabaseConfigured } = useAuth()
  const navigate = useNavigate()
  const [authError, setAuthError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const bindTooltip = useHoverTooltip()
  // Estado próprio (não formState.isSubmitting do react-hook-form): esse
  // reverte assim que a função onSubmit termina, mesmo em caso de sucesso —
  // e a navegação pro painel só acontece depois, via useEffect reagindo a
  // isAuthenticated (que muda de forma assíncrona, fora do onSubmit). Sem
  // um estado próprio, o botão piscaria de volta pra "Entrar" por um
  // instante antes da tela trocar. Só reseta nos caminhos de erro.
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const remembered = localStorage.getItem(REMEMBER_KEY)

  const { register, handleSubmit, setFocus } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usuario: remembered ?? '',
      senha: '',
      lembrar: Boolean(remembered),
    },
  })

  useEffect(() => {
    if (isAuthenticated) navigate(ROUTES.dashboard, { replace: true })
  }, [isAuthenticated, navigate])

  async function onSubmit(values) {
    setAuthError('')
    setIsLoggingIn(true)

    if (!isSupabaseConfigured) {
      setAuthError('Configuração do Supabase ausente. Não é possível autenticar.')
      setIsLoggingIn(false)
      return
    }
    if (!values.usuario.trim() || !values.senha) {
      setAuthError('Preencha usuário e senha.')
      setIsLoggingIn(false)
      return
    }

    const { data, error } = await signIn(values.usuario, values.senha)

    if (error || !data?.user) {
      setAuthError('E-mail ou senha incorretos. Verifique e tente novamente.')
      setIsLoggingIn(false)
      return
    }

    if (values.lembrar) {
      localStorage.setItem(REMEMBER_KEY, values.usuario.trim())
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
    // Sucesso: não reseta isLoggingIn aqui de propósito — o botão continua
    // "Entrando..." até o useEffect (isAuthenticated) navegar pra fora
    // desta tela, sem piscar de volta pra "Entrar" no meio do caminho.
  }

  const submit = handleSubmit(onSubmit)

  return (
    <div className={styles.loginScreen}>
      <div className={styles.loginVisual}>
        <img src={loginBackground} alt="Logo GMAD Grupo Madcompen" />
        <div className={styles.loginVisualContent}>
          <p>Painel interno de controle de ativos de tecnologia.</p>
        </div>
      </div>
      <div className={styles.loginFormSide}>
        <div className={styles.loginBox}>
          <div className={styles.loginBrand}>
            <div className={styles.lbText}>
              <span className={styles.lbSub}>GMAD Madville | Curitiba</span>
            </div>
          </div>
          <h1>Acesse o Painel de TI</h1>

          <div
            className={`${styles.loginError} ${authError ? styles.show : ''}`}
            role="alert"
            aria-live="assertive"
          >
            {authError}
          </div>

          <div className={styles.loginField}>
            <label htmlFor="loginUser">Usuário</label>
            <div className={styles.inputWrap}>
              <input
                type="text"
                id="loginUser"
                autoComplete="username"
                placeholder="nome.sobrenome"
                {...register('usuario')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    setFocus('senha')
                  }
                }}
              />
            </div>
          </div>
          <div className={styles.loginField}>
            <label htmlFor="loginPass">Senha</label>
            <div className={styles.inputWrap}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="loginPass"
                className={styles.inputWithToggle}
                autoComplete="current-password"
                placeholder="••••••••••"
                {...register('senha')}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submit()
                  }
                }}
              />
              <button
                type="button"
                className={styles.loginTogglePw}
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                {...bindTooltip(showPassword ? 'Ocultar senha' : 'Mostrar senha')}
              >
                {showPassword ? <EyeOffIcon width={17} height={17} /> : <EyeIcon width={17} height={17} />}
              </button>
            </div>
          </div>
          <label className={styles.loginRemember}>
            <input type="checkbox" id="rememberUser" {...register('lembrar')} /> Lembrar meu usuário
            neste computador
          </label>
          <button
            className={styles.btnLogin}
            type="button"
            disabled={isLoggingIn}
            aria-busy={isLoggingIn}
            onClick={submit}
          >
            {isLoggingIn ? (
              <SpinnerIcon className={styles.btnSpinner} width={15} height={15} />
            ) : (
              <LoginIcon className={styles.btnIcon} width={15} height={15} />
            )}
            {isLoggingIn ? 'Entrando...' : 'Entrar'}
          </button>
          <div className={styles.loginFoot}>
            Problemas para entrar? Fale com a{' '}
            <a href="mailto:suporte.ti@madville.com.br" className={styles.loginFootLink}>
              <b>equipe de TI</b>
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  )
}
