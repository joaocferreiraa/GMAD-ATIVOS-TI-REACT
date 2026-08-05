import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import FormField from '../../ui/FormField/FormField'
import { FormGrid } from '../../ui/FormField/FormField'
import Input from '../../ui/Input/Input'
import Select from '../../ui/Select/Select'
import { getUnidades } from '../../../utils/units'
import { getContatoDepartamentos } from '../../../utils/contatosFilter'
import { unitDisplayName } from '../../../utils/formatters'
import { useToast } from '../../../hooks/useToast'

const NOVO_DEPARTAMENTO = '__novo__'

function buildDefaultValues(contato) {
  return {
    nome: contato?.nome || '',
    unidade: contato?.unidade || '',
    departamento: contato?.departamento || '',
    departamentoNovo: '',
    celular: contato?.celular || '',
    telefone: contato?.telefone || '',
    ramal: contato?.ramal || '',
    email: contato?.email || '',
    isGestor: contato?.isGestor || false,
  }
}

// Formulário de cadastro/edição de colaborador (openContatoModal() do
// sistema original). `contato` null = novo colaborador. A Unidade vem do
// cadastro de Ativos (getUnidades(assets)), igual ao original; Departamento
// vem só dos próprios colaboradores.
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

  const { control, register, handleSubmit, watch, reset } = useForm({
    defaultValues: buildDefaultValues(contato),
  })

  useEffect(() => {
    if (open) reset(buildDefaultValues(contato))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, contato])

  const departamento = watch('departamento')

  const unidadeOptions = getUnidades(assets)
  if (contato?.unidade && !unidadeOptions.includes(contato.unidade))
    unidadeOptions.push(contato.unidade)
  const departamentoOptions = getContatoDepartamentos(contatos)
  if (contato?.departamento && !departamentoOptions.includes(contato.departamento))
    departamentoOptions.push(contato.departamento)

  function onSubmit(values) {
    const nome = values.nome.trim()
    const unidade = values.unidade
    const departamentoFinal =
      values.departamento === NOVO_DEPARTAMENTO
        ? values.departamentoNovo.trim()
        : values.departamento.trim()

    if (!nome || !unidade || !departamentoFinal) {
      showToast('Preencha o nome, a unidade e o departamento.', 'danger')
      return
    }

    const record = {
      nome,
      unidade,
      departamento: departamentoFinal,
      isGestor: values.isGestor,
      celular: values.celular.trim(),
      telefone: values.telefone.trim(),
      ramal: values.ramal.trim(),
      email: values.email.trim(),
    }
    onSave(record, isEdit)
  }

  const submit = handleSubmit(onSubmit)

  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton={false}
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
        <FormField label="Nome" required htmlFor="c_nome">
          <Input id="c_nome" placeholder="Ex: João Ferreira" {...register('nome')} />
        </FormField>
        <FormField label="Unidade" required htmlFor="c_unidade">
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
        <FormField label="Departamento" required htmlFor="c_departamento">
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
                  { value: NOVO_DEPARTAMENTO, label: '+ Novo departamento...' },
                ]}
              />
            )}
          />
          {departamento === NOVO_DEPARTAMENTO && (
            <Input
              placeholder="Digite o novo departamento"
              style={{ marginTop: 8 }}
              {...register('departamentoNovo')}
            />
          )}
        </FormField>
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
