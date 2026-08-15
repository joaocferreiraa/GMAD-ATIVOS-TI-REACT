import BaseButton from '../../../components/ui/Button/Button'
import BaseModal from '../../../components/ui/Modal/Modal'
import Drawer from '../../../components/ui/Drawer/Drawer'
import Loading from '../../../components/ui/Loading/Loading'

// Adaptadores entre a API de componentes que as telas de TI esperam (elas
// vieram de outro projeto) e a dos componentes desta plataforma.
//
// Preferi adaptar aqui a reescrever as telas: são 4 diferenças pequenas de
// nome de prop, e concentrá-las num arquivo mantém as telas próximas do
// original — se um dia forem atualizadas a partir do projeto de origem, o
// conflito fica restrito a este arquivo.

// isLoading -> disabled + texto; variant 'primary' -> 'default' (o padrão daqui).
export function Button({ isLoading, disabled, variant, children, ...props }) {
  return (
    <BaseButton
      variant={variant === 'primary' ? 'default' : variant}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? 'Aguarde...' : children}
    </BaseButton>
  )
}

// isOpen -> open; position="right" -> Drawer (a plataforma tem componente
// próprio para painel lateral, com a animação e o overlay já corretos).
export function Modal({ isOpen, onClose, title, width, position, footer, children }) {
  if (position === 'right') {
    return (
      <Drawer open={isOpen} onClose={onClose} wide>
        {title && <h2 style={{ marginTop: 0 }}>{title}</h2>}
        {children}
        {footer}
      </Drawer>
    )
  }

  return (
    <BaseModal open={isOpen} onClose={onClose} title={title} footer={footer} maxWidth={width}>
      {children}
    </BaseModal>
  )
}

export function Spinner() {
  return <Loading />
}

// A plataforma não tem PageHeader: o título das páginas é montado direto no
// JSX de cada uma. Reproduzimos aqui a mesma estrutura para as telas de TI
// não destoarem do resto.
export function PageHeader({ title, subtitle }) {
  return (
    <div>
      <h1 style={{ margin: 0 }}>{title}</h1>
      {subtitle && <p style={{ margin: '4px 0 0', opacity: 0.7 }}>{subtitle}</p>}
    </div>
  )
}

// Input, Select e Textarea das telas de TI recebem `label` e repassam o resto
// para o elemento nativo. Os da plataforma usam FormField para o rótulo, então
// montamos o par label+campo aqui.
export function Input({ label, hint, required, style, ...props }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {label}
          {required && <span style={{ color: 'var(--danger, #ef4444)' }}> *</span>}
        </span>
      )}
      <input style={{ padding: '8px 12px', ...style }} {...props} />
      {hint && <span style={{ fontSize: 11, opacity: 0.7 }}>{hint}</span>}
    </label>
  )
}

export function Select({ label, hint, required, options, children, style, ...props }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {label}
          {required && <span style={{ color: 'var(--danger, #ef4444)' }}> *</span>}
        </span>
      )}
      <select style={{ padding: '8px 12px', ...style }} {...props}>
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
      {hint && <span style={{ fontSize: 11, opacity: 0.7 }}>{hint}</span>}
    </label>
  )
}

export function Textarea({ label, hint, required, style, ...props }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {label && (
        <span style={{ fontSize: 12, fontWeight: 600 }}>
          {label}
          {required && <span style={{ color: 'var(--danger, #ef4444)' }}> *</span>}
        </span>
      )}
      <textarea style={{ padding: '8px 12px', resize: 'vertical', ...style }} {...props} />
      {hint && <span style={{ fontSize: 11, opacity: 0.7 }}>{hint}</span>}
    </label>
  )
}
