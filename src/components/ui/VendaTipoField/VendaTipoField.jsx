import { Controller } from 'react-hook-form'
import FormField from '../FormField/FormField'
import Select from '../Select/Select'
import { VENDA_TIPOS } from '../../../utils/departamentos'

// Campo "Tipo de vendedor" (Interno(a)/Externo(a)/Consumidor Final),
// mostrado só quando o departamento selecionado é Vendas — usado tanto no
// formulário de Ativo quanto no de Contato (ver DEPARTAMENTO_VENDAS em
// utils/departamentos.js). `name` tem valor padrão 'vendaTipo' (o campo do
// formulário nos dois usos atuais), mas pode ser sobrescrito caso um futuro
// formulário registre esse campo sob outro nome.
export default function VendaTipoField({ control, id, name = 'vendaTipo', error }) {
  return (
    <FormField label="Tipo de vendedor" htmlFor={id} error={error}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <Select
            id={id}
            value={field.value}
            onChange={field.onChange}
            options={[
              { value: '', label: 'Selecione o tipo' },
              ...VENDA_TIPOS.map((v) => ({ value: v, label: v })),
            ]}
          />
        )}
      />
    </FormField>
  )
}
