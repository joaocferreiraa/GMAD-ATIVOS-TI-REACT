import { useEffect, useRef, useState } from 'react'
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
import VendaTipoField from '../../ui/VendaTipoField/VendaTipoField'
import AlmoxarifadoAreaField from '../../ui/AlmoxarifadoAreaField/AlmoxarifadoAreaField'
import { CATEGORIES } from '../../../constants/categories'
import { FIELD_GROUPS } from '../../../constants/fieldGroups'
import { getUnidades } from '../../../utils/units'
import {
  getDepartamentoOptions,
  getAlmoxarifadoAreaOptions,
  DEPARTAMENTO_VENDAS,
  DEPARTAMENTO_ALMOXARIFADO,
  NOVO_ITEM,
  resolveNovoValue,
} from '../../../utils/departamentos'
import { getResponsavelOptions } from '../../../utils/assetsFilter'
import { unitDisplayName } from '../../../utils/formatters'
import { nextIdFor } from '../../../utils/id'
import { useToast } from '../../../hooks/useToast'
import panelStyles from '../AssetPanel.module.css'
import modalStyles from '../../ui/Modal/Modal.module.css'
import formFieldStyles from '../../ui/FormField/FormField.module.css'

const CATEGORY_OPTIONS = CATEGORIES.map((c) => ({ value: c, label: c }))

// Todas as chaves de spec técnico usadas por alguma categoria — usada pra
// limpar campos da categoria anterior que não pertencem à nova categoria ao
// salvar (ex: IMEI de um Celular que virou Desktop), já que a mutação de
// update faz um merge raso e manteria esses valores presos pra sempre.
const ALL_SPEC_KEYS = Array.from(
  new Set(Object.values(FIELD_GROUPS).flatMap((group) => group.map((f) => f.key))),
)

// Preço/aluguel são opcionais (string vazia = "não informado"), mas quando
// preenchidos precisam ser um número válido e não-negativo — o
// `type="number"` do campo não basta sozinho: nenhum modal do sistema usa
// <form> de verdade (ver Modal.jsx), então a validação nativa do HTML nunca
// dispara, e um valor negativo digitado distorceria o "Total investido" do
// Dashboard (soma parseFloat(a.preco) sem checar sinal).
const nonNegativeMoney = z
  .string()
  .trim()
  .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), {
    message: 'Informe um valor igual ou maior que zero.',
  })

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
    vendaTipo: z.string(),
    almoxarifadoArea: z.string(),
    almoxarifadoAreaNovo: z.string(),
    usuario: z.string(),
    usuarioNovo: z.string(),
    preco: nonNegativeMoney,
    valorAluguel: nonNegativeMoney,
  })
  .loose()
  .refine((data) => data.departamento !== NOVO_ITEM || data.departamentoNovo.trim(), {
    message: 'Informe o novo departamento.',
    path: ['departamentoNovo'],
  })
  .refine((data) => data.usuario !== NOVO_ITEM || data.usuarioNovo.trim(), {
    message: 'Informe o nome do usuário.',
    path: ['usuarioNovo'],
  })
  .refine(
    (data) =>
      resolveNovoValue(data.departamento, data.departamentoNovo) !== DEPARTAMENTO_VENDAS ||
      data.vendaTipo.trim(),
    { message: 'Selecione o tipo de vendedor.', path: ['vendaTipo'] },
  )
  .refine(
    (data) =>
      resolveNovoValue(data.departamento, data.departamentoNovo) !== DEPARTAMENTO_ALMOXARIFADO ||
      data.almoxarifadoArea.trim(),
    { message: 'Selecione a área do almoxarifado.', path: ['almoxarifadoArea'] },
  )
  .refine((data) => data.almoxarifadoArea !== NOVO_ITEM || data.almoxarifadoAreaNovo.trim(), {
    message: 'Informe a nova área.',
    path: ['almoxarifadoAreaNovo'],
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
    vendaTipo: asset?.vendaTipo || '',
    almoxarifadoArea: asset?.almoxarifadoArea || '',
    almoxarifadoAreaNovo: '',
    usuario: asset?.usuario || '',
    usuarioNovo: '',
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
  contatos,
  defaultUnidade,
  onClose,
  onSave,
  onDelete,
}) {
  // Edição é definida pelo `uid`, não pela mera presença de `asset`: o botão
  // "Cadastrar" de uma máquina detectada abre este formulário já preenchido
  // com o que o agente sabe, mas SEM uid, porque o registro ainda não existe
  // (ver handleCadastrarDetectada em AtivosPage). Com `!!asset` esse caso
  // caía no caminho de update, que procura o registro por um uid indefinido,
  // não acha nada, e ainda assim anuncia "Ativo atualizado com sucesso" —
  // o cadastro simplesmente não acontecia.
  const isEdit = !!asset?.uid
  const { showToast } = useToast()
  const [shake, setShake] = useState(false)
  // Guarda o último ID que o PRÓPRIO componente gerou (não um valor
  // recalculado) — é isso que permite reconhecer "esse ID foi automático"
  // com certeza, em vez de tentar adivinhar pela categoria/unidade
  // anteriores (que quebra se a unidade mudou entre um auto-preenchimento e
  // outro, ver handleUnidadeChange). `null` = nada foi auto-gerado ainda
  // nesta sessão do formulário.
  const lastAutoId = useRef(null)

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
    if (open) {
      reset(buildDefaultValues(asset, defaultUnidade))
      lastAutoId.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, asset])

  const categoria = watch('categoria')
  const departamento = watch('departamento')
  const departamentoNovo = watch('departamentoNovo')
  const usuario = watch('usuario')
  const posse = watch('posse')
  const specGroups = FIELD_GROUPS[categoria] || []
  const isImpressora = categoria === 'Impressora'
  const isAlugada = isImpressora && posse === 'Alugado'
  // Nome efetivo do departamento pra decidir se mostra "Tipo de vendedor"
  // durante a digitação — quando "+ Novo departamento..." está selecionado,
  // `departamento` é só o sentinel NOVO_ITEM, então o nome de verdade vem
  // de `departamentoNovo` (mesma resolução do onSubmit, ver resolveNovoValue).
  const departamentoEfetivo = resolveNovoValue(departamento, departamentoNovo)

  const unidadeOptions = getUnidades(assets)
  if (asset?.unidade && !unidadeOptions.includes(asset.unidade)) unidadeOptions.push(asset.unidade)
  const departamentoOptions = getDepartamentoOptions(assets, contatos)
  if (asset?.departamento && !departamentoOptions.includes(asset.departamento))
    departamentoOptions.push(asset.departamento)
  const responsavelOptions = getResponsavelOptions(assets, contatos)
  if (asset?.usuario && !responsavelOptions.includes(asset.usuario))
    responsavelOptions.push(asset.usuario)
  const almoxarifadoAreaOptions = getAlmoxarifadoAreaOptions(assets, contatos)
  if (asset?.almoxarifadoArea && !almoxarifadoAreaOptions.includes(asset.almoxarifadoArea))
    almoxarifadoAreaOptions.push(asset.almoxarifadoArea)

  function handleCategoriaChange(newCategoria, onChange) {
    onChange(newCategoria)
    // `asset` direto, e não `isEdit ? asset : null`: numa máquina detectada
    // ele carrega o que o agente leu (processador, RAM, disco), e trocar a
    // categoria não deve jogar isso fora. Em "+ Novo ativo" ele é null de
    // qualquer forma, então o campo continua nascendo em branco.
    setValue('spec', buildSpecDefaults(newCategoria, asset))
    if (newCategoria !== 'Impressora' && getValues('posse') === 'Alugado') {
      setValue('posse', 'Comprado')
      setValue('valorAluguel', '')
      setValue('renovacaoAluguel', '')
    }
    if (!isEdit) {
      const currentId = getValues('id')
      const unidadeVal = getValues('unidade')
      // "Parece automático" = é exatamente o último ID que o próprio
      // componente gerou (lastAutoId), não um valor recalculado — assim
      // continua reconhecendo como automático mesmo que a unidade tenha
      // mudado depois do preenchimento (ver handleUnidadeChange), e nunca
      // confunde com um ID digitado à mão só porque começa com um prefixo
      // de categoria válido (ex: "TV-RECEPCAO" pra uma Televisão).
      const looksAuto = !currentId || currentId === lastAutoId.current
      if (looksAuto && unidadeVal) {
        const newId = nextIdFor(assets, newCategoria, unidadeVal)
        setValue('id', newId)
        lastAutoId.current = newId
      }
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
      const newId = nextIdFor(assets, getValues('categoria'), newUnidade)
      setValue('id', newId)
      lastAutoId.current = newId
    }
  }

  function onSubmit(values) {
    const id = values.id
    const unidade = values.unidade
    const departamentoFinal = resolveNovoValue(values.departamento, values.departamentoNovo)
    const vendaTipoFinal = departamentoFinal === DEPARTAMENTO_VENDAS ? values.vendaTipo.trim() : ''
    const almoxarifadoAreaFinal =
      departamentoFinal === DEPARTAMENTO_ALMOXARIFADO
        ? resolveNovoValue(values.almoxarifadoArea, values.almoxarifadoAreaNovo)
        : ''
    const usuarioFinal = resolveNovoValue(values.usuario, values.usuarioNovo)
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
      vendaTipo: vendaTipoFinal,
      almoxarifadoArea: almoxarifadoAreaFinal,
      usuario: usuarioFinal,
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
                <Input id="f_id" placeholder="Ex: DSK-0028" maxLength={60} {...register('id')} />
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
                      maxLength={100}
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
                <VendaTipoField
                  control={control}
                  id="f_vendaTipo"
                  error={errors.vendaTipo?.message}
                />
              )}
              {departamentoEfetivo === DEPARTAMENTO_ALMOXARIFADO && (
                <AlmoxarifadoAreaField
                  control={control}
                  register={register}
                  watch={watch}
                  errors={errors}
                  id="f_almoxarifadoArea"
                  options={almoxarifadoAreaOptions}
                />
              )}
            </FormGrid>
          </div>

          <div className={panelStyles.viewCard}>
            <div className={panelStyles.viewSectionTitle}>Responsável</div>
            <FormGrid>
              <FormField label="Usuário" full htmlFor="f_usuario">
                <Controller
                  control={control}
                  name="usuario"
                  render={({ field }) => (
                    <Select
                      id="f_usuario"
                      value={field.value}
                      onChange={field.onChange}
                      options={[
                        { value: '', label: 'Selecione o usuário' },
                        ...responsavelOptions.map((nome) => ({ value: nome, label: nome })),
                        { value: NOVO_ITEM, label: '+ Novo usuário...' },
                      ]}
                    />
                  )}
                />
                {usuario === NOVO_ITEM && (
                  <>
                    <Input
                      placeholder="Digite o nome do usuário"
                      style={{ marginTop: 8 }}
                      maxLength={150}
                      {...register('usuarioNovo')}
                    />
                    {errors.usuarioNovo && (
                      <span className={formFieldStyles.errorMessage} role="alert">
                        {errors.usuarioNovo.message}
                      </span>
                    )}
                  </>
                )}
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
                  <FormField
                    label="Valor do aluguel (R$)"
                    htmlFor="f_valorAluguel"
                    error={errors.valorAluguel?.message}
                  >
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
                  <FormField label="Preço de compra (R$)" htmlFor="f_preco" error={errors.preco?.message}>
                    <Input
                      id="f_preco"
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      {...register('preco')}
                    />
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
