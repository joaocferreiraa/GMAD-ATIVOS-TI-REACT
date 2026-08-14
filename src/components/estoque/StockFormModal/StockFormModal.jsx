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
import { getUnidades } from '../../../utils/units'
import { unitDisplayName } from '../../../utils/formatters'
import { STOCK_TIPOS, STOCK_STATUS_OPTIONS } from '../../../constants/stock'
import { useToast } from '../../../hooks/useToast'
import modalStyles from '../../ui/Modal/Modal.module.css'

const TIPO_OPTIONS = STOCK_TIPOS.map((t) => ({ value: t, label: t }))
const STATUS_OPTIONS = STOCK_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))

const stockSchema = z
  .object({
    item: z.string().trim().min(1, 'Informe o nome do item.'),
    // Só dígitos (sem "-", sem ".") — quantidade em estoque não pode ser
    // negativa nem fracionária. O `min={0}`/`type="number"` do campo não
    // bastam sozinhos: nenhum modal do sistema usa <form> de verdade (ver
    // Modal.jsx), então a validação nativa do HTML nunca dispara.
    quantidade: z
      .coerce.string()
      .trim()
      .min(1, 'Informe a quantidade.')
      .refine((v) => /^\d+$/.test(v), 'Informe um número inteiro igual ou maior que zero.'),
  })
  .loose()

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
  const [shake, setShake] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(stockSchema),
    defaultValues: buildDefaultValues(item),
  })

  useEffect(() => {
    if (open) reset(buildDefaultValues(item))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  const unidadeOptions = getUnidades(assets)
  if (item?.unidade && !unidadeOptions.includes(item.unidade)) unidadeOptions.push(item.unidade)

  function onSubmit(values) {
    const record = {
      tipo: values.tipo,
      item: values.item,
      marcaModelo: values.marcaModelo.trim(),
      quantidade: values.quantidade,
      unidade: values.unidade.trim(),
      status: values.status,
      observacoes: values.observacoes.trim(),
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
        <FormField label="Nome do item" required htmlFor="s_item" error={errors.item?.message}>
          <Input
            id="s_item"
            placeholder="Ex: Memória RAM 8GB DDR4"
            maxLength={150}
            {...register('item')}
          />
        </FormField>
        <FormField label="Marca / Modelo" htmlFor="s_marcaModelo">
          <Input
            id="s_marcaModelo"
            placeholder="Ex: Kingston KVR26N19S8"
            maxLength={150}
            {...register('marcaModelo')}
          />
        </FormField>
        <FormField
          label="Quantidade em estoque"
          required
          htmlFor="s_quantidade"
          error={errors.quantidade?.message}
        >
          <Input
            id="s_quantidade"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            {...register('quantidade')}
          />
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
            maxLength={1000}
            {...register('observacoes')}
          />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
