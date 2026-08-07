import styles from './FormField.module.css'

// Grade responsiva que organiza os FormField de um formulário (.form-grid).
export function FormGrid({ className = '', children, ...props }) {
  return (
    <div className={`${styles.grid} ${className}`} {...props}>
      {children}
    </div>
  )
}

// Par label + campo (.form-field). `required` acrescenta o asterisco laranja;
// `full` faz o campo ocupar a linha inteira da grade (.form-field.full).
export default function FormField({
  label,
  htmlFor,
  required,
  full,
  className = '',
  children,
  ...props
}) {
  const classes = [
    styles.field,
    required ? styles.required : '',
    full ? styles.full : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
    </div>
  )
}
