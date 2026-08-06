import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import FormField from '../../ui/FormField/FormField'
import { FormGrid } from '../../ui/FormField/FormField'
import Input from '../../ui/Input/Input'
import Select from '../../ui/Select/Select'
import { getUnidades } from '../../../utils/units'
import { unitDisplayName } from '../../../utils/formatters'
import { STOCK_TIPOS, STOCK_STATUS_OPTIONS } from '../../../constants/stock'
import { useToast } from '../../../hooks/useToast'

const TIPO_OPTIONS = STOCK_TIPOS.map((t) => ({ value: t, label: t }))
const STATUS_OPTIONS = STOCK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))

function buildDefaultValues(item) {
  return {
    tipo: item?.tipo || 'Peça de computador',
    item: item?.item || '',
    marcaModelo: item?.marcaModelo || '',
    quantidade: item?.quantidade ?? '',
    unidade: item?.unidade || '',
    status: item?.status || 'Disponível',
    observacoes: item?.observacoes || '',
  }
}

// Formulário de cadastro/edição de item de estoque (openStockModal() do
// sistema original). `item` null = novo item. A Unidade vem do cadastro de
// Ativos (getUnidades(assets)), igual ao original.
export default function StockFormModal({ open, item, assets, onClose, onSave, onDelete }) {
  const isEdit = !!item
  const { showToast } = useToast()

  const { control, register, handleSubmit, reset } = useForm({
    defaultValues: buildDefaultValues(item),
  })

  useEffect(() => {
    if (open) reset(buildDefaultValues(item))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  const unidadeOptions = getUnidades(assets)
  if (item?.unidade && !unidadeOptions.includes(item.unidade)) unidadeOptions.push(item.unidade)

  function onSubmit(values) {
    const itemNome = values.item.trim()
    const quantidade = String(values.quantidade).trim()

    if (!itemNome || quantidade === '') {
      showToast('Preencha o nome do item e a quantidade.', 'danger')
      return
    }

    const record = {
      tipo: values.tipo,
      item: itemNome,
      marcaModelo: values.marcaModelo.trim(),
      quantidade,
      unidade: values.unidade.trim(),
      status: values.status,
      observacoes: values.observacoes.trim(),
    }
    onSave(record, isEdit)
  }

  const submit = handleSubmit(onSubmit)

  return (
    <Modal
      open={open}
      onClose={onClose}
      showCloseButton={false}
      title={isEdit ? 'Editar item de estoque' : 'Novo item de estoque'}
      subtitle={
        isEdit
          ? 'Atualize as informações do item.'
          : 'Cadastre uma peça, periférico ou dispositivo disponível.'
      }
      footer={
        <>
          <div>
            {isEdit && (
              <Button variant="dangerGhost" onClick={() => onDelete(item)}>
                Excluir item
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={submit}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar item'}
            </Button>
          </div>
        </>
      }
    >
      <FormGrid>
        <FormField label="Tipo" required htmlFor="s_tipo">
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                id="s_tipo"
                value={field.value}
                onChange={field.onChange}
                options={TIPO_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Nome do item" required htmlFor="s_item">
          <Input id="s_item" placeholder="Ex: Memória RAM 8GB DDR4" {...register('item')} />
        </FormField>
        <FormField label="Marca / Modelo" htmlFor="s_marcaModelo">
          <Input
            id="s_marcaModelo"
            placeholder="Ex: Kingston KVR26N19S8"
            {...register('marcaModelo')}
          />
        </FormField>
        <FormField label="Quantidade em estoque" required htmlFor="s_quantidade">
          <Input id="s_quantidade" type="number" min={0} step={1} {...register('quantidade')} />
        </FormField>
        <FormField label="Unidade / Local de armazenamento" htmlFor="s_unidade">
          <Controller
            control={control}
            name="unidade"
            render={({ field }) => (
              <Select
                id="s_unidade"
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
        <FormField label="Status" htmlFor="s_status">
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select
                id="s_status"
                value={field.value}
                onChange={field.onChange}
                options={STATUS_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Observações" full htmlFor="s_observacoes">
          <Input
            id="s_observacoes"
            placeholder="Ex: reservado para troca no NTB-0012"
            {...register('observacoes')}
          />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
