import styles from './Card.module.css'

// Card genérico (.card do sistema original). `variant="plain"` remove fundo
// /borda (.card-plain); `attn` adiciona a faixa lateral de atenção (.card--attn).
export default function Card({
  title,
  subtitle,
  variant,
  attn,
  className = '',
  children,
  ...props
}) {
  const classes = [
    styles.card,
    variant === 'plain' ? styles.plain : '',
    attn ? styles.attn : '',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classes} {...props}>
      {title && <h3 className={styles.title}>{title}</h3>}
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {children}
    </div>
  )
}
