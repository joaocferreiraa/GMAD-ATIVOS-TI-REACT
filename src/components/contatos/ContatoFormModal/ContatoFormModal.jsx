import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import FormField from '../../ui/FormField/FormField'
import { FormGrid } from '../../ui/FormField/FormField'
import Input from '../../ui/Input/Input'
import Select from '../../ui/Select/Select'
import VendaTipoField from '../../ui/VendaTipoField/VendaTipoField'
import { getUnidades } from '../../../utils/units'
import {
  getDepartamentoOptions,
  DEPARTAMENTO_VENDAS,
  NOVO_ITEM,
  resolveNovoValue,
} from '../../../utils/departamentos'
import { unitDisplayName } from '../../../utils/formatters'
import { useToast } from '../../../hooks/useToast'
import modalStyles from '../../ui/Modal/Modal.module.css'
import formFieldStyles from '../../ui/FormField/FormField.module.css'

const contatoSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome.'),
    unidade: z.string().min(1, 'Selecione a unidade.'),
    departamento: z.string().min(1, 'Selecione o departamento.'),
    departamentoNovo: z.string(),
    vendaTipo: z.string(),
  })
  .loose()
  .refine((data) => data.departamento !== NOVO_ITEM || data.departamentoNovo.trim(), {
    message: 'Informe o novo departamento.',
    path: ['departamentoNovo'],
  })
  .refine(
    (data) =>
      resolveNovoValue(data.departamento, data.departamentoNovo) !== DEPARTAMENTO_VENDAS ||
      data.vendaTipo.trim(),
    { message: 'Selecione o tipo de vendedor.', path: ['vendaTipo'] },
  )

function buildDefaultValues(contato) {
  return {
    nome: contato?.nome || '',
    unidade: contato?.unidade || '',
    departamento: contato?.departamento || '',
    departamentoNovo: '',
    vendaTipo: contato?.vendaTipo || '',
    celular: contato?.celular || '',
    telefone: contato?.telefone || '',
    ramal: contato?.ramal || '',
    email: contato?.email || '',
    isGestor: contato?.isGestor || false,
  }
}

// Formulário de cadastro/edição de colaborador (openContatoModal() do
// sistema original). `contato` null = novo colaborador. Unidade vem do
// cadastro de Ativos (getUnidades); Departamento vem de getDepartamentoOptions
// (união de Ativos + Contatos + extras), pra um departamento criado num
// módulo aparecer como opção no outro também.
export default function ContatoFormModal({
  open,
  contato,
  contatos,
  assets,
  onClose,
  onSave,
  onDelete,
}) {
  const isEdit = !!contato
  const { showToast } = useToast()
  const [shake, setShake] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(contatoSchema),
    defaultValues: buildDefaultValues(contato),
  })

  useEffect(() => {
    if (open) reset(buildDefaultValues(contato))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contato])

  const departamento = watch('departamento')
  const departamentoNovo = watch('departamentoNovo')
  // Nome efetivo do departamento pra decidir se mostra "Tipo de vendedor"
  // durante a digitação — quando "+ Novo departamento..." está selecionado,
  // `departamento` é só o sentinel NOVO_ITEM, então o nome de verdade vem
  // de `departamentoNovo` (mesma resolução do onSubmit, ver resolveNovoValue).
  const departamentoEfetivo = resolveNovoValue(departamento, departamentoNovo)

  const unidadeOptions = getUnidades(assets)
  if (contato?.unidade && !unidadeOptions.includes(contato.unidade))
    unidadeOptions.push(contato.unidade)
  const departamentoOptions = getDepartamentoOptions(assets, contatos)
  if (contato?.departamento && !departamentoOptions.includes(contato.departamento))
    departamentoOptions.push(contato.departamento)

  function onSubmit(values) {
    const departamentoFinal = resolveNovoValue(values.departamento, values.departamentoNovo)
    const vendaTipoFinal = departamentoFinal === DEPARTAMENTO_VENDAS ? values.vendaTipo.trim() : ''

    const record = {
      nome: values.nome,
      unidade: values.unidade,
      departamento: departamentoFinal,
      vendaTipo: vendaTipoFinal,
      isGestor: values.isGestor,
      celular: values.celular.trim(),
      telefone: values.telefone.trim(),
      ramal: values.ramal.trim(),
      email: values.email.trim(),
    }
    onSave(record, isEdit)
  }

  function onInvalid() {
    showToast('Corrija os campos destacados.', 'danger')
    setShake(true)
    setTimeout(() => setShake(false), 320)
  }

  const submit = handleSubmit(onSubmit, onInvalid)

  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton={false}
      className={shake ? modalStyles.shake : ''}
      title={isEdit ? 'Editar colaborador' : 'Novo colaborador'}
      subtitle={
        isEdit
          ? 'Atualize os dados de contato do colaborador.'
          : 'Cadastre um colaborador e seus dados de contato.'
      }
      footer={
        <>
          <div>
            {isEdit && (
              <Button variant="dangerGhost" onClick={() => onDelete(contato)}>
                Excluir colaborador
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={submit}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar colaborador'}
            </Button>
          </div>
        </>
      }
    >
      <FormGrid>
        <FormField label="Nome" required htmlFor="c_nome" error={errors.nome?.message}>
          <Input id="c_nome" placeholder="Ex: João Ferreira" {...register('nome')} />
        </FormField>
        <FormField
          label="Unidade"
          required
          htmlFor="c_unidade"
          error={errors.unidade?.message}
        >
          <Controller
            control={control}
            name="unidade"
            render={({ field }) => (
              <Select
                id="c_unidade"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: '', label: 'Selecione a unidade' },
                  ...unidadeOptions.map((u) => ({ value: u, label: unitDisplayName(u) })),
                ]}
              />
            )}
          />
        </FormField>
        <FormField
          label="Departamento"
          required
          htmlFor="c_departamento"
          error={errors.departamento?.message}
        >
          <Controller
            control={control}
            name="departamento"
            render={({ field }) => (
              <Select
                id="c_departamento"
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: '', label: 'Selecione o departamento' },
                  ...departamentoOptions.map((d) => ({ value: d, label: d })),
                  { value: NOVO_ITEM, label: '+ Novo departamento...' },
                ]}
              />
            )}
          />
          {departamento === NOVO_ITEM && (
            <>
              <Input
                placeholder="Digite o novo departamento"
                style={{ marginTop: 8 }}
                {...register('departamentoNovo')}
              />
              {errors.departamentoNovo && (
                <span className={formFieldStyles.errorMessage} role="alert">
                  {errors.departamentoNovo.message}
                </span>
              )}
            </>
          )}
        </FormField>
        {departamentoEfetivo === DEPARTAMENTO_VENDAS && (
          <VendaTipoField control={control} id="c_vendaTipo" error={errors.vendaTipo?.message} />
        )}
        <FormField label="Celular corporativo" htmlFor="c_celular">
          <Input id="c_celular" placeholder="Ex: Samsung Galaxy A55" {...register('celular')} />
        </FormField>
        <FormField label="Telefone" htmlFor="c_telefone">
          <Input id="c_telefone" placeholder="Ex: (41) 99999-9999" {...register('telefone')} />
        </FormField>
        <FormField label="Ramal" htmlFor="c_ramal">
          <Input id="c_ramal" placeholder="Ex: 1234" {...register('ramal')} />
        </FormField>
        <FormField label="E-mail corporativo" full htmlFor="c_email">
          <Input
            id="c_email"
            type="email"
            placeholder="Ex: joao@gmad.com.br"
            {...register('email')}
          />
        </FormField>
        <FormField full style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input
            type="checkbox"
            id="c_isGestor"
            style={{ width: 'auto' }}
            {...register('isGestor')}
          />
          <label htmlFor="c_isGestor" style={{ margin: 0 }}>
            Gestor responsável pelo departamento
          </label>
        </FormField>
      </FormGrid>
    </Modal>
  )
}
