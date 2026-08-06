import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import FormField from '../../ui/FormField/FormField'
import { FormGrid } from '../../ui/FormField/FormField'
import Input from '../../ui/Input/Input'

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

  useEffect(() => {
    if (open) reset(buildDefaultValues(fields, values))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, values])

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
        {fields.map((f) => (
          <FormField key={f.key} label={f.label} full={f.wide} htmlFor={`f_${f.key}`}>
            <Input id={`f_${f.key}`} {...register(f.key)} />
          </FormField>
        ))}
      </FormGrid>
    </Modal>
  )
}
