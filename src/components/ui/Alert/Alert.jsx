import styles from './Alert.module.css'

const VARIANT_CLASS = {
  danger: '',
  warning: styles.warning,
  success: styles.success,
  info: styles.info,
}

// Banner de alerta inline (equivalente ao .login-error, generalizado com
// variantes danger/warning/success/info).
export default function Alert({ variant = 'danger', className = '', children, ...props }) {
  if (!children) return null

  const classes = [styles.alert, VARIANT_CLASS[variant], className].filter(Boolean).join(' ')

  return (
    <div className={classes} role="alert" {...props}>
      {children}
    </div>
  )
}
