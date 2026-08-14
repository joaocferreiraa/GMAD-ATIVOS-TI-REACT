import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import FormField from '../../ui/FormField/FormField'
import { FormGrid } from '../../ui/FormField/FormField'
import Input from '../../ui/Input/Input'
import { EyeIcon, EyeOffIcon } from '../../ui/Icon/icons'
import { useHoverTooltip } from '../../../hooks/overlay/useHoverTooltip'
import styles from './InfraFormModal.module.css'

function buildDefaultValues(fields, values) {
  return Object.fromEntries(fields.map((f) => [f.key, values?.[f.key] || '']))
}

// Modal genérico de edição de Construshow/Wi-Fi (openInfraConstrushowModal()/
// openInfraWifiModal() do sistema original) — os campos variam por chamada
// (`fields`); não há exclusão em nenhum dos dois casos (o original não tem
// delete para infraestrutura).
export default function InfraFormModal({ open, title, subtitle, fields, values, onClose, onSave }) {
  const { register, handleSubmit, reset } = useForm({
    defaultValues: buildDefaultValues(fields, values),
  })
  const bindTooltip = useHoverTooltip()

  useEffect(() => {
    if (open) reset(buildDefaultValues(fields, values))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, values])

  // Campos com `masked: true` (ex: senha de Wi-Fi) abrem escondidos — ao
  // contrário da ficha de visualização (que já mascara), este formulário
  // mostrava a senha em texto puro direto na tela ao clicar em "Editar".
  // Reesconde sempre que o modal reabre (mesmo padrão de "reseta ao abrir"
  // de ImportInfraModal — ajusta o estado durante o render comparando com a
  // última abertura processada, em vez de useEffect+setState).
  const [visibleFields, setVisibleFields] = useState(() => new Set())
  const [visibilityResetFor, setVisibilityResetFor] = useState(false)
  if (open !== visibilityResetFor) {
    setVisibilityResetFor(open)
    if (open) setVisibleFields(new Set())
  }

  function toggleVisible(key) {
    setVisibleFields((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function onSubmit(formValues) {
    const record = {}
    fields.forEach((f) => {
      record[f.key] = (formValues[f.key] || '').trim()
    })
    onSave(record)
  }

  const submit = handleSubmit(onSubmit)

  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton={false}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <div />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={submit}>
              Salvar alterações
            </Button>
          </div>
        </>
      }
    >
      <FormGrid>
        {fields.map((f) => {
          if (!f.masked) {
            return (
              <FormField key={f.key} label={f.label} full={f.wide} htmlFor={`f_${f.key}`}>
                <Input id={`f_${f.key}`} inputMode={f.inputMode} {...register(f.key)} />
              </FormField>
            )
          }
          const isVisible = visibleFields.has(f.key)
          return (
            <FormField key={f.key} label={f.label} full={f.wide} htmlFor={`f_${f.key}`}>
              <div className={styles.maskedWrap}>
                <Input
                  id={`f_${f.key}`}
                  type={isVisible ? 'text' : 'password'}
                  className={styles.maskedInput}
                  {...register(f.key)}
                />
                <button
                  type="button"
                  className={styles.togglePw}
                  onClick={() => toggleVisible(f.key)}
                  aria-label={isVisible ? `Ocultar ${f.label}` : `Mostrar ${f.label}`}
                  {...bindTooltip(isVisible ? 'Ocultar' : 'Mostrar')}
                >
                  {isVisible ? (
                    <EyeOffIcon width={16} height={16} />
                  ) : (
                    <EyeIcon width={16} height={16} />
                  )}
                </button>
              </div>
            </FormField>
          )
        })}
      </FormGrid>
    </Modal>
  )
}
