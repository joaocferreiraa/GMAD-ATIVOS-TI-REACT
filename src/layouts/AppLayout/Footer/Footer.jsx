import styles from './Footer.module.css'

const SUPPORT_EMAIL = 'suporte.ti@madville.com.br'
const BUILD_NUMBER = import.meta.env.VITE_BUILD_NUMBER || '0'
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE
  ? new Date(import.meta.env.VITE_BUILD_DATE).toLocaleDateString('pt-BR')
  : null

// Barra de rodapé mínima: copyright, versão (data + número do build,
// embutidos em build time — ver vite.config.js) e contato de suporte por
// e-mail.
export default function Footer() {
  return (
    <div className={styles.bottomBar}>
      <div className={styles.bottomBarInner}>
        <p className={styles.bottomCopy}>
          © {new Date().getFullYear()} GMAD Madville | Curitiba — Controle de TI
        </p>
        <p className={styles.bottomMeta}>
          Versão {BUILD_DATE ? `${BUILD_DATE} · ` : ''}v{BUILD_NUMBER} · Suporte:{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.bottomLink}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  )
}
