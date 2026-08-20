import styles from './Footer.module.css'

const SUPPORT_EMAIL = 'suporte.ti@madville.com.br'
const BUILD_DATE = import.meta.env.VITE_BUILD_DATE
  ? new Date(import.meta.env.VITE_BUILD_DATE).toLocaleDateString('pt-BR')
  : null

// Barra de rodapé mínima: copyright, data do último build (embutida em
// build time — ver vite.config.js) e o e-mail de suporte.
//
// O e-mail vai sozinho, sem o rótulo "Suporte:" que o antecedia — um
// endereço de TI no rodapé já se explica, e a palavra só somava ruído numa
// linha que é toda de metadado discreto.
export default function Footer() {
  return (
    <div className={styles.bottomBar}>
      <div className={styles.bottomBarInner}>
        <p className={styles.bottomCopy}>
          © {new Date().getFullYear()} GMAD Madville | Curitiba — Painel de TI
        </p>
        <p className={styles.bottomMeta}>
          {BUILD_DATE ? `Última data de atualização: ${BUILD_DATE} · ` : ''}
          <a href={`mailto:${SUPPORT_EMAIL}`} className={styles.bottomLink}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </div>
  )
}
