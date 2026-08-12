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
import AssetSpecFields from '../AssetSpecFields/AssetSpecFields'
import { CATEGORIES } from '../../../constants/categories'
import { FIELD_GROUPS, ID_PREFIX } from '../../../constants/fieldGroups'
import { getDepartamentos, getUnidades } from '../../../utils/units'
import { unitDisplayName } from '../../../utils/formatters'
import { nextIdFor } from '../../../utils/id'
import { useToast } from '../../../hooks/useToast'
import panelStyles from '../AssetPanel.module.css'
import modalStyles from '../../ui/Modal/Modal.module.css'
import formFieldStyles from '../../ui/FormField/FormField.module.css'

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }))
const NOVO_DEPARTAMENTO = '__novo__'

// Todas as chaves de spec técnico usadas por alguma categoria — usada pra
// limpar campos da categoria anterior que não pertencem à nova categoria ao
// salvar (ex: IMEI de um Celular que virou Desktop), já que a mutação de
// update faz um merge raso e manteria esses valores presos pra sempre.
const ALL_SPEC_KEYS = Array.from(
  new Set(Object.values(FIELD_GROUPS).flatMap((group) => group.map((f) => f.key))),
)

// Só os campos indispensáveis pro registro fazer sentido (mesmos exigidos
// pela checagem manual anterior); `.loose()` mantém os demais campos do
// formulário (spec, departamento, usuário, ...) intocados na saída.
const assetSchema = z
  .object({
    categoria: z.string(),
    id: z.string().trim().min(1, 'Informe o ID do ativo.'),
    unidade: z.string().trim().min(1, 'Selecione a unidade.'),
    departamento: z.string(),
    departamentoNovo: z.string(),
  })
  .loose()
  .refine((data) => data.departamento !== NOVO_DEPARTAMENTO || data.departamentoNovo.trim(), {
    message: 'Informe o novo departamento.',
    path: ['departamentoNovo'],
  })

function buildSpecDefaults(categoria, asset) {
  const groups = FIELD_GROUPS[categoria] || []
  return Object.fromEntries(groups.map((g) => [g.key, asset?.[g.key] || '']))
}

function buildDefaultValues(asset, defaultUnidade) {
  const categoria = asset?.categoria || 'Desktop'
  return {
    categoria,
    id: asset?.id || '',
    etiqueta: asset?.etiqueta === 'Possui' ? 'Possui' : '',
    unidade: asset?.unidade || defaultUnidade || '',
    departamento: asset?.departamento || '',
    departamentoNovo: '',
    usuario: asset?.usuario || '',
    posse: asset?.posse === 'Alugado' || asset?.posse === 'Comprado' ? asset.posse : '',
    dataAquisicao: asset?.dataAquisicao || '',
    garantiaAte: asset?.garantiaAte || '',
    preco: asset?.preco ?? '',
    valorAluguel: asset?.valorAluguel ?? '',
    renovacaoAluguel: asset?.renovacaoAluguel || '',
    status: asset?.status || 'Ativo',
    spec: buildSpecDefaults(categoria, asset),
  }
}

// Formulário de cadastro/edição de ativo (.modal do sistema original, layout
// de ficha compartilhado com AssetViewModal). `asset` null = novo ativo.
export default function AssetFormModal({
  open,
  asset,
  assets,
  defaultUnidade,
  onClose,
  onSave,
  onDelete,
}) {
  const isEdit = !!asset
  const { showToast } = useToast()
  const [shake, setShake] = useState(false)

  const {
    control,
    register,
    handleSubmit,
    watch,
    getValues,
    setValue,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(assetSchema),
    defaultValues: buildDefaultValues(asset, defaultUnidade),
  })

  useEffect(() => {
    if (open) reset(buildDefaultValues(asset, defaultUnidade))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset])

  const categoria = watch('categoria')
  const departamento = watch('departamento')
  const posse = watch('posse')
  const specGroups = FIELD_GROUPS[categoria] || []
  const isImpressora = categoria === 'Impressora'
  const isAlugada = isImpressora && posse === 'Alugado'

  const unidadeOptions = getUnidades(assets)
  if (asset?.unidade && !unidadeOptions.includes(asset.unidade)) unidadeOptions.push(asset.unidade)
  const departamentoOptions = getDepartamentos(assets)
  if (asset?.departamento && !departamentoOptions.includes(asset.departamento))
    departamentoOptions.push(asset.departamento)

  function handleCategoriaChange(newCategoria, onChange) {
    onChange(newCategoria)
    setValue('spec', buildSpecDefaults(newCategoria, isEdit ? asset : null))
    if (newCategoria !== 'Impressora' && getValues('posse') === 'Alugado') {
      setValue('posse', 'Comprado')
      setValue('valorAluguel', '')
      setValue('renovacaoAluguel', '')
    }
    if (!isEdit) {
      const currentId = getValues('id')
      const looksAuto = !currentId || Object.values(ID_PREFIX).some((p) => currentId.startsWith(p))
      const unidadeVal = getValues('unidade')
      if (looksAuto && unidadeVal) setValue('id', nextIdFor(assets, newCategoria, unidadeVal))
    }
  }

  function handlePosseChange(newPosse, onChange) {
    onChange(newPosse)
    if (newPosse === 'Alugado') {
      setValue('dataAquisicao', '')
      setValue('garantiaAte', '')
      setValue('preco', '')
    } else {
      setValue('valorAluguel', '')
      setValue('renovacaoAluguel', '')
    }
  }

  function handleUnidadeChange(newUnidade, onChange) {
    onChange(newUnidade)
    if (!isEdit && !getValues('id')) {
      setValue('id', nextIdFor(assets, getValues('categoria'), newUnidade))
    }
  }

  function onSubmit(values) {
    const id = values.id
    const unidade = values.unidade
    const departamentoFinal =
      values.departamento === NOVO_DEPARTAMENTO
        ? values.departamentoNovo.trim()
        : values.departamento.trim()
    const spec = Object.fromEntries(
      Object.entries(values.spec || {}).map(([k, v]) => [k, typeof v === 'string' ? v.trim() : v]),
    )
    // Zera antes de reaplicar: sem isso, um valor de uma categoria/situação
    // anterior (ex: IMEI de Celular, aluguel de Impressora) sobreviveria pro
    // sempre no registro salvo, já que o update faz merge raso.
    const clearedSpec = Object.fromEntries(ALL_SPEC_KEYS.map((k) => [k, undefined]))

    const record = {
      categoria: values.categoria,
      id,
      unidade,
      departamento: departamentoFinal,
      usuario: values.usuario.trim(),
      etiqueta: values.etiqueta,
      dataAquisicao: values.dataAquisicao,
      garantiaAte: values.garantiaAte,
      preco: values.preco,
      status: values.status,
      posse: undefined,
      valorAluguel: undefined,
      renovacaoAluguel: undefined,
      ...clearedSpec,
      ...(values.categoria === 'Impressora'
        ? { posse: values.posse, valorAluguel: values.valorAluguel, renovacaoAluguel: values.renovacaoAluguel }
        : {}),
      ...spec,
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
      maxWidth="min(94vw, 1040px)"
      className={shake ? modalStyles.shake : ''}
      footer={
        <>
          <div>
            {isEdit && (
              <Button variant="dangerGhost" onClick={() => onDelete(asset)}>
                Excluir ativo
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={submit}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar ativo'}
            </Button>
          </div>
        </>
      }
    >
      <div className={panelStyles.viewHeader}>
        <div className={panelStyles.viewHeaderRow}>
          <div>
            <h2 className={panelStyles.viewHeadTitle}>{isEdit ? 'Editar ativo' : 'Novo ativo'}</h2>
            <p className={panelStyles.modalSub}>
              {isEdit
                ? 'Atualize as informações e salve para sincronizar com a equipe.'
                : 'Preencha os dados do equipamento a ser cadastrado.'}
            </p>
          </div>
          <Button size="sm" onClick={onClose}>
            Voltar
          </Button>
        </div>
      </div>

      <div className={panelStyles.viewGrid}>
        <div className={panelStyles.viewCol}>
          <div className={panelStyles.viewCard}>
            <div className={panelStyles.viewSectionTitle}>Informações gerais</div>
            <FormGrid>
              <FormField
                label="Categoria"
                required
                htmlFor="f_categoria"
                error={errors.categoria?.message}
              >
                <Controller
                  control={control}
                  name="categoria"
                  render={({ field }) => (
                    <Select
                      id="f_categoria"
                      value={field.value}
                      onChange={(v) => handleCategoriaChange(v, field.onChange)}
                      options={CATEGORY_OPTIONS}
                    />
                  )}
                />
              </FormField>
              <FormField
                label="ID do ativo (hostname/tag)"
                required
                htmlFor="f_id"
                error={errors.id?.message}
              >
                <Input id="f_id" placeholder="Ex: DSK-0028" {...register('id')} />
              </FormField>
              <FormField label="Etiqueta física" htmlFor="f_etiqueta">
                <Controller
                  control={control}
                  name="etiqueta"
                  render={({ field }) => (
                    <Select
                      id="f_etiqueta"
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: 'Não possui' },
                        { value: 'Possui', label: 'Possui' },
                      ]}
                    />
                  )}
                />
              </FormField>
              <AssetSpecFields groups={specGroups} control={control} register={register} />
            </FormGrid>
          </div>
        </div>

        <div className={panelStyles.viewCol}>
          <div className={panelStyles.viewCard}>
            <div className={panelStyles.viewSectionTitle}>Localização</div>
            <FormGrid>
              <FormField
                label="Unidade / Local"
                required
                htmlFor="f_unidade"
                error={errors.unidade?.message}
              >
                <Controller
                  control={control}
                  name="unidade"
                  render={({ field }) => (
                    <Select
                      id="f_unidade"
                      value={field.value}
                      onChange={(v) => handleUnidadeChange(v, field.onChange)}
                      options={[
                        { value: '', label: 'Selecione a unidade' },
                        ...unidadeOptions.map((u) => ({ value: u, label: unitDisplayName(u) })),
                      ]}
                    />
                  )}
                />
              </FormField>
              <FormField label="Departamento" htmlFor="f_departamento">
                <Controller
                  control={control}
                  name="departamento"
                  render={({ field }) => (
                    <Select
                      id="f_departamento"
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
            </FormGrid>
          </div>

          <div className={panelStyles.viewCard}>
            <div className={panelStyles.viewSectionTitle}>Responsável</div>
            <FormGrid>
              <FormField label="Usuário" full htmlFor="f_usuario">
                <Input id="f_usuario" {...register('usuario')} />
              </FormField>
            </FormGrid>
          </div>

          <div className={panelStyles.viewCard}>
            <div className={panelStyles.viewSectionTitle}>Informações complementares</div>
            <FormGrid>
              {isImpressora && (
                <FormField label="Situação" htmlFor="f_posse">
                  <Controller
                    control={control}
                    name="posse"
                    render={({ field }) => (
                      <Select
                        id="f_posse"
                        value={field.value}
                        onChange={(v) => handlePosseChange(v, field.onChange)}
                        options={[
                          { value: '', label: 'Não definida' },
                          { value: 'Comprado', label: 'Comprada' },
                          { value: 'Alugado', label: 'Alugada' },
                        ]}
                      />
                    )}
                  />
                </FormField>
              )}
              {isAlugada ? (
                <>
                  <FormField label="Valor do aluguel (R$)" htmlFor="f_valorAluguel">
                    <Input id="f_valorAluguel" type="number" step="0.01" {...register('valorAluguel')} />
                  </FormField>
                  <FormField label="Renovação do contrato" htmlFor="f_renovacaoAluguel">
                    <Input id="f_renovacaoAluguel" type="date" {...register('renovacaoAluguel')} />
                  </FormField>
                </>
              ) : (
                <>
                  <FormField label="Data de aquisição" htmlFor="f_dataAquisicao">
                    <Input id="f_dataAquisicao" type="date" {...register('dataAquisicao')} />
                  </FormField>
                  <FormField label="Garantia até" htmlFor="f_garantiaAte">
                    <Input id="f_garantiaAte" type="date" {...register('garantiaAte')} />
                  </FormField>
                  <FormField label="Preço de compra (R$)" htmlFor="f_preco">
                    <Input id="f_preco" type="number" step="0.01" {...register('preco')} />
                  </FormField>
                </>
              )}
              <FormField label="Status" htmlFor="f_status">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select
                      id="f_status"
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: 'Ativo', label: 'Ativo' },
                        { value: 'Manutenção', label: 'Manutenção' },
                        { value: 'Inativo', label: 'Inativo' },
                      ]}
                    />
                  )}
                />
              </FormField>
            </FormGrid>
          </div>
        </div>
      </div>
    </Modal>
  )
}
