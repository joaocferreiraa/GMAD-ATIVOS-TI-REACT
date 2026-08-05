import { forwardRef } from 'react'
import styles from './Input.module.css'

// Campo de texto genérico. Passe `as="textarea"` para o equivalente de
// .form-field textarea (fonte mono, redimensionável).
const Input = forwardRef(function Input({ as = 'input', className = '', ...props }, ref) {
  const Component = as
  const classes = [styles.input, as === 'textarea' ? styles.textarea : '', className]
    .filter(Boolean)
    .join(' ')

  return <Component ref={ref} className={classes} {...props} />
})

export default Input
