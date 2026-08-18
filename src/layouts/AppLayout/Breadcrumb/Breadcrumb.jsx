import { useLocation } from 'react-router-dom'
import { breadcrumbTrail } from './breadcrumbTrail'
import styles from './Breadcrumb.module.css'

// Trilha da aba/sub-aba aberta ("Inventário / Estoque"), no topo do conteúdo
// — acima do título da página. Texto puro, sem links: o último item é a
// página atual e o primeiro é só o nome do grupo, que não tem rota própria
// (grupos abrem um flyout na barra lateral, ver SidebarGroupFlyout).
export default function Breadcrumb() {
  const { pathname } = useLocation()
  const trail = breadcrumbTrail(pathname)

  // Some com menos de dois itens: uma trilha de um nível só repete o título
  // da página sem mostrar hierarquia nenhuma. Hoje isso é só o Painel geral
  // (único item solto do menu, e a tela em que o login já cai), mas a regra
  // é sobre a forma da trilha, não sobre aquela rota.
  if (trail.length < 2) return null

  return (
    <nav className={styles.breadcrumb} aria-label="Trilha de navegação">
      {trail.map((label, index) => (
        <span key={label} className={styles.crumb}>
          {index > 0 && (
            <span className={styles.separator} aria-hidden="true">
              /
            </span>
          )}
          <span className={index === trail.length - 1 ? styles.current : undefined}>{label}</span>
        </span>
      ))}
    </nav>
  )
}
