import { Controller } from 'react-hook-form'
import FormField from '../FormField/FormField'
import Select from '../Select/Select'
import Input from '../Input/Input'
import { NOVO_ITEM } from '../../../utils/departamentos'
import formFieldStyles from '../FormField/FormField.module.css'

// Campo "Área do almoxarifado", mostrado só quando o departamento
// selecionado é Almoxarifado (ver DEPARTAMENTO_ALMOXARIFADO em
// utils/departamentos.js) — usado tanto no formulário de Ativo quanto no de
// Contato. Mesmo padrão "Select + Novo ..." do Departamento/Usuário (ver
// NOVO_ITEM/resolveNovoValue): extraído aqui porque os dois formulários
// precisam do mesmo par de campos (almoxarifadoArea + almoxarifadoAreaNovo)
// e da mesma lógica de exibição condicional do campo de texto livre.
export default function AlmoxarifadoAreaField({
  control,
  register,
  watch,
  errors,
  id,
  options,
  name = 'almoxarifadoArea',
  novoName = 'almoxarifadoAreaNovo',
}) {
  const selected = watch(name)
  return (
    <FormField label="Área do almoxarifado" htmlFor={id} error={errors[name]?.message}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            id={id}
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: '', label: 'Selecione a área' },
              ...options.map((v) => ({ value: v, label: v })),
              { value: NOVO_ITEM, label: '+ Nova área...' },
            ]}
          />
        )}
      />
      {selected === NOVO_ITEM && (
        <>
          <Input
            placeholder="Digite a nova área"
            style={{ marginTop: 8 }}
            maxLength={100}
            {...register(novoName)}
          />
          {errors[novoName] && (
            <span className={formFieldStyles.errorMessage} role="alert">
              {errors[novoName].message}
            </span>
          )}
        </>
      )}
    </FormField>
  )
}
