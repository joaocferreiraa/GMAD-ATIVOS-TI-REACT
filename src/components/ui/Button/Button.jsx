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
const Button = forwardRef(function Button(
  { variant = 'default', size, className = '', type = 'button', ...props },
  ref,
) {
  const classes = [styles.btn, VARIANT_CLASS[variant], size === 'sm' ? styles.sm : '', className]
    .filter(Boolean)
    .join(' ')

  return <button ref={ref} type={type} className={classes} {...props} />
})

export default Button
