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
import { INSTALLER_CATEGORIAS, INSTALLER_ARQUITETURAS } from '../../../constants/installers'
import { useToast } from '../../../hooks/useToast'
import { isHttpUrl } from '../../../utils/urlValidation'
import modalStyles from '../../ui/Modal/Modal.module.css'

const CATEGORIA_OPTIONS = INSTALLER_CATEGORIAS.map((c) => ({ value: c, label: c }))
const ARQUITETURA_OPTIONS = INSTALLER_ARQUITETURAS.map((a) => ({ value: a, label: a }))

const installerSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome do programa.'),
    urlDownload: z
      .string()
      .trim()
      .refine((v) => !v || isHttpUrl(v), 'O link de download deve ser uma URL http(s) válida.'),
  })
  .loose()

function buildDefaultValues(item) {
  return {
    nome: item?.nome || '',
    categoria: item?.categoria || 'Utilitários',
    versao: item?.versao || '',
    arquitetura: item?.arquitetura || '64 bits',
    tamanho: item?.tamanho || '',
    desenvolvedor: item?.desenvolvedor || '',
    dataAtualizacao: item?.dataAtualizacao || '',
    urlDownload: item?.urlDownload || '',
    observacoes: item?.observacoes || '',
  }
}

// Formulário de cadastro/edição de instalador (openInstallerModal() do
// sistema original). `item` null = novo instalador.
export default function InstallerFormModal({ open, item, onClose, onSave, onDelete }) {
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
    resolver: zodResolver(installerSchema),
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
      versao: values.versao.trim(),
      arquitetura: values.arquitetura,
      tamanho: values.tamanho.trim(),
      desenvolvedor: values.desenvolvedor.trim(),
      dataAtualizacao: values.dataAtualizacao,
      urlDownload: values.urlDownload,
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
      title={isEdit ? 'Editar instalador' : 'Novo instalador'}
      subtitle={
        isEdit
          ? 'Atualize as informações do programa.'
          : 'Cadastre um programa homologado para a equipe de TI.'
      }
      footer={
        <>
          <div>
            {isEdit && (
              <Button variant="dangerGhost" onClick={() => onDelete(item)}>
                Excluir instalador
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={submit}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar instalador'}
            </Button>
          </div>
        </>
      }
    >
      <FormGrid>
        <FormField label="Nome do programa" required htmlFor="i_nome" error={errors.nome?.message}>
          <Input id="i_nome" placeholder="Ex: AnyDesk" maxLength={150} {...register('nome')} />
        </FormField>
        <FormField label="Categoria" required htmlFor="i_categoria">
          <Controller
            control={control}
            name="categoria"
            render={({ field }) => (
              <Select
                id="i_categoria"
                value={field.value}
                onChange={field.onChange}
                options={CATEGORIA_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Versão" htmlFor="i_versao">
          <Input id="i_versao" placeholder="Ex: 8.1.2" maxLength={40} {...register('versao')} />
        </FormField>
        <FormField label="Arquitetura" htmlFor="i_arquitetura">
          <Controller
            control={control}
            name="arquitetura"
            render={({ field }) => (
              <Select
                id="i_arquitetura"
                value={field.value}
                onChange={field.onChange}
                options={ARQUITETURA_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Tamanho" htmlFor="i_tamanho">
          <Input id="i_tamanho" placeholder="Ex: 45MB" maxLength={40} {...register('tamanho')} />
        </FormField>
        <FormField label="Desenvolvedor" htmlFor="i_desenvolvedor">
          <Input
            id="i_desenvolvedor"
            placeholder="Ex: AnyDesk Software GmbH"
            maxLength={150}
            {...register('desenvolvedor')}
          />
        </FormField>
        <FormField label="Última atualização" htmlFor="i_dataAtualizacao">
          <Input id="i_dataAtualizacao" type="date" {...register('dataAtualizacao')} />
        </FormField>
        <FormField
          label="Link de download"
          htmlFor="i_urlDownload"
          error={errors.urlDownload?.message}
        >
          <Input
            id="i_urlDownload"
            placeholder="URL do arquivo (Supabase Storage, rede interna...)"
            maxLength={2000}
            {...register('urlDownload')}
          />
        </FormField>
        <FormField label="Observações" full htmlFor="i_observacoes">
          <Input
            id="i_observacoes"
            placeholder="Ex: usar apenas a versão MSI para instalação silenciosa"
            maxLength={1000}
            {...register('observacoes')}
          />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
