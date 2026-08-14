import { Controller } from 'react-hook-form'
import FormField from '../../ui/FormField/FormField'
import Input from '../../ui/Input/Input'
import Select from '../../ui/Select/Select'

// Campos técnicos dinâmicos de acordo com a categoria selecionada
// (FIELD_GROUPS do sistema original). Sem `options` vira Input; com
// `options` vira Select.
export default function AssetSpecFields({ groups, control, register }) {
  return (
    <>
      {groups.map((group) => (
        <FormField key={group.key} label={group.label} htmlFor={`spec_${group.key}`}>
          {group.options ? (
            <Controller
              control={control}
              name={`spec.${group.key}`}
              render={({ field }) => (
                <Select
                  id={`spec_${group.key}`}
                  value={field.value || ''}
                  onChange={field.onChange}
                  options={[
                    { value: '', label: 'Selecione...' },
                    ...group.options.map((o) => ({ value: o, label: o })),
                  ]}
                  aria-label={group.label}
                />
              )}
            />
          ) : (
            <Input
              id={`spec_${group.key}`}
              type={group.type || 'text'}
              maxLength={200}
              {...register(`spec.${group.key}`)}
            />
          )}
        </FormField>
      ))}
    </>
  )
}
