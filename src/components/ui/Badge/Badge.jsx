import styles from './Badge.module.css'

const VARIANT_CLASS = {
  ok: styles.ok,
  warn: styles.warn,
  danger: styles.danger,
  muted: styles.muted,
}

// Pílula de status reutilizável. Cobre tanto os badges de status (Ativo/
// Manutenção/Inativo) quanto os de garantia (ok/vence em breve/vencida/sem
// data) do sistema original — mapeie o significado do seu domínio para uma
// destas 4 variantes visuais.
export default function Badge({ variant = 'ok', className = '', children, ...props }) {
  const classes = [styles.badge, VARIANT_CLASS[variant], className].filter(Boolean).join(' ')

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  )
}
