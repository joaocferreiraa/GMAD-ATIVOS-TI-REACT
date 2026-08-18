import { forwardRef } from 'react'
import styles from './Button.module.css'

const VARIANT_CLASS = {
  default: '',
  primary: styles.primary,
  brand: styles.brand,
  ghost: styles.ghost,
  dangerGhost: styles.dangerGhost,
  danger: styles.danger,
}

// Botão genérico reutilizável (.btn do sistema original). `variant` cobre as
// mesmas variações visuais (primary/brand/ghost/dangerGhost/danger); `size="sm"`
// reduz padding/fonte igual a .btn-sm.
//
// `as` renderiza outro elemento com a aparência de botão — para quando a
// ação é NAVEGAR, não executar código: `as="a"` para endereços externos e
// esquemas de URL (`rustdesk://`), `as={Link}` para rotas internas do
// router. Um <button> com onClick que faz `location.href` quebraria abrir
// em nova aba, o menu de contexto e a leitura por leitores de tela, que
// anunciam link e botão de formas diferentes. `type` só é emitido no
// <button>: em <a> não existe e o React avisaria no console.
const Button = forwardRef(function Button(
  { as: Tag = 'button', variant = 'default', size, className = '', type = 'button', ...props },
  ref,
) {
  const classes = [styles.btn, VARIANT_CLASS[variant], size === 'sm' ? styles.sm : '', className]
    .filter(Boolean)
    .join(' ')

  const extra = Tag === 'button' ? { type } : {}

  return <Tag ref={ref} className={classes} {...extra} {...props} />
})

export default Button
