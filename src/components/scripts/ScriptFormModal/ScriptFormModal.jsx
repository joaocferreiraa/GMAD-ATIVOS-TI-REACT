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
import { SCRIPT_CATEGORIAS, SCRIPT_TIPOS } from '../../../constants/scripts'
import { useToast } from '../../../hooks/useToast'
import { isHttpUrl } from '../../../utils/urlValidation'
import modalStyles from '../../ui/Modal/Modal.module.css'

const CATEGORIA_OPTIONS = SCRIPT_CATEGORIAS.map((c) => ({ value: c, label: c }))
const TIPO_OPTIONS = SCRIPT_TIPOS.map((t) => ({ value: t, label: t }))

const scriptSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome do script.'),
    urlDownload: z
      .string()
      .trim()
      .refine((v) => !v || isHttpUrl(v), 'O link de download deve ser uma URL http(s) válida.'),
  })
  .loose()

function buildDefaultValues(item) {
  return {
    nome: item?.nome || '',
    categoria: item?.categoria || 'Windows',
    tipo: item?.tipo || 'BAT',
    extensao: item?.extensao || '',
    versao: item?.versao || '',
    autor: item?.autor || '',
    dataCriacao: item?.dataCriacao || '',
    dataAtualizacao: item?.dataAtualizacao || '',
    tamanho: item?.tamanho || '',
    urlDownload: item?.urlDownload || '',
    descricao: item?.descricao || '',
    observacoes: item?.observacoes || '',
    codigo: item?.codigo || '',
  }
}

// Formulário de cadastro/edição de script (openScriptModal() do sistema
// original). `item` null = novo script. `favorito`/`downloads` não fazem
// parte do formulário — só são alterados pelo botão de favorito/pelo
// próprio download, igual ao original.
export default function ScriptFormModal({ open, item, onClose, onSave, onDelete }) {
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
    resolver: zodResolver(scriptSchema),
    defaultValues: buildDefaultValues(item),
  })

  useEffect(() => {
    if (open) reset(buildDefaultValues(item))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  function onSubmit(values) {
    const record = {
      nome: values.nome,
      categoria: values.categoria,
      tipo: values.tipo,
      extensao: values.extensao.trim(),
      versao: values.versao.trim(),
      autor: values.autor.trim(),
      dataCriacao: values.dataCriacao,
      dataAtualizacao: values.dataAtualizacao,
      tamanho: values.tamanho.trim(),
      urlDownload: values.urlDownload,
      descricao: values.descricao.trim(),
      observacoes: values.observacoes.trim(),
      codigo: values.codigo,
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
      title={isEdit ? 'Editar script' : 'Novo script'}
      subtitle={
        isEdit
          ? 'Atualize as informações do script.'
          : 'Cadastre um script ou automação para a equipe de TI.'
      }
      footer={
        <>
          <div>
            {isEdit && (
              <Button variant="dangerGhost" onClick={() => onDelete(item)}>
                Excluir script
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={submit}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar script'}
            </Button>
          </div>
        </>
      }
    >
      <FormGrid>
        <FormField
          label="Nome do script"
          required
          htmlFor="sc_nome"
          error={errors.nome?.message}
        >
          <Input id="sc_nome" placeholder="Ex: Limpeza de temporários" {...register('nome')} />
        </FormField>
        <FormField label="Categoria" required htmlFor="sc_categoria">
          <Controller
            control={control}
            name="categoria"
            render={({ field }) => (
              <Select
                id="sc_categoria"
                value={field.value}
                onChange={field.onChange}
                options={CATEGORIA_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Tipo de arquivo" htmlFor="sc_tipo">
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                id="sc_tipo"
                value={field.value}
                onChange={field.onChange}
                options={TIPO_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Extensão" htmlFor="sc_extensao">
          <Input id="sc_extensao" placeholder="Ex: ps1" {...register('extensao')} />
        </FormField>
        <FormField label="Versão" htmlFor="sc_versao">
          <Input id="sc_versao" placeholder="Ex: 1.0" {...register('versao')} />
        </FormField>
        <FormField label="Autor" htmlFor="sc_autor">
          <Input id="sc_autor" placeholder="Ex: Equipe de TI" {...register('autor')} />
        </FormField>
        <FormField label="Data de criação" htmlFor="sc_dataCriacao">
          <Input id="sc_dataCriacao" type="date" {...register('dataCriacao')} />
        </FormField>
        <FormField label="Última atualização" htmlFor="sc_dataAtualizacao">
          <Input id="sc_dataAtualizacao" type="date" {...register('dataAtualizacao')} />
        </FormField>
        <FormField label="Tamanho" htmlFor="sc_tamanho">
          <Input id="sc_tamanho" placeholder="Ex: 12KB" {...register('tamanho')} />
        </FormField>
        <FormField
          label="Link de download"
          htmlFor="sc_urlDownload"
          error={errors.urlDownload?.message}
        >
          <Input
            id="sc_urlDownload"
            placeholder="URL do arquivo (Supabase Storage, rede interna...)"
            {...register('urlDownload')}
          />
        </FormField>
        <FormField label="Descrição" full htmlFor="sc_descricao">
          <Input
            id="sc_descricao"
            placeholder="O que esse script faz, resumidamente"
            {...register('descricao')}
          />
        </FormField>
        <FormField label="Observações" full htmlFor="sc_observacoes">
          <Input
            id="sc_observacoes"
            placeholder="Ex: requer execução como administrador"
            {...register('observacoes')}
          />
        </FormField>
        <FormField label="Código do script" full htmlFor="sc_codigo">
          <Input
            id="sc_codigo"
            as="textarea"
            placeholder="Cole aqui o conteúdo do script (opcional)"
            {...register('codigo')}
          />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
