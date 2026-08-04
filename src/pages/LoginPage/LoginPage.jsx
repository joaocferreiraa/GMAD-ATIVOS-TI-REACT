import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/auth/useAuth'
import { ROUTES } from '../../constants/routes'
import loginBackground from '../../assets/images/login-background.png'
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

  const remembered = localStorage.getItem(REMEMBER_KEY)

  const {
    register,
    handleSubmit,
    setFocus,
    formState: { isSubmitting },
  } = useForm({
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

    if (!isSupabaseConfigured) {
      setAuthError('Configuração do Supabase ausente. Não é possível autenticar.')
      return
    }
    if (!values.usuario.trim() || !values.senha) {
      setAuthError('Preencha usuário e senha.')
      return
    }

    const { data, error } = await signIn(values.usuario, values.senha)

    if (error || !data?.user) {
      setAuthError('E-mail ou senha incorretos. Verifique e tente novamente.')
      return
    }

    if (values.lembrar) {
      localStorage.setItem(REMEMBER_KEY, values.usuario.trim())
    } else {
      localStorage.removeItem(REMEMBER_KEY)
    }
  }

  const submit = handleSubmit(onSubmit)

  return (
    <div className={styles.loginScreen}>
      <div className={styles.loginVisual}>
        <img src={loginBackground} alt="Frota GMAD Madville" />
        <div className={styles.loginVisualContent}>
          <h2>Cada equipamento tem um histórico — e um responsável cuidando dele.</h2>
          <p>Painel interno de controle de ativos de tecnologia.</p>
        </div>
      </div>
      <div className={styles.loginFormSide}>
        <div className={styles.loginBox}>
          <div className={styles.loginBrand}>
            <div className={styles.lbText}>
              <span className={styles.lbSub}>GMAD Madville · Curitiba</span>
            </div>
          </div>
          <h1>Acesse o Controle de Ativos</h1>

          <div className={`${styles.loginError} ${authError ? styles.show : ''}`}>{authError}</div>

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
              >
                {showPassword ? 'OCULTAR' : 'MOSTRAR'}
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
            disabled={isSubmitting}
            onClick={submit}
          >
            Acessar o sistema
          </button>
          <div className={styles.loginFoot}>
            Problemas para entrar? Fale com a <b>equipe de TI</b>.
          </div>
        </div>
      </div>
    </div>
  )
}
