import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import Modal from '../../ui/Modal/Modal'
import Button from '../../ui/Button/Button'
import FormField from '../../ui/FormField/FormField'
import { FormGrid } from '../../ui/FormField/FormField'
import Input from '../../ui/Input/Input'
import Select from '../../ui/Select/Select'
import { INSTALLER_CATEGORIAS, INSTALLER_ARQUITETURAS } from '../../../constants/installers'
import { useToast } from '../../../hooks/useToast'
import { isHttpUrl } from '../../../utils/urlValidation'

const CATEGORIA_OPTIONS = INSTALLER_CATEGORIAS.map((c) => ({ value: c, label: c }))
const ARQUITETURA_OPTIONS = INSTALLER_ARQUITETURAS.map((a) => ({ value: a, label: a }))

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

  const { control, register, handleSubmit, reset } = useForm({
    defaultValues: buildDefaultValues(item),
  })

  useEffect(() => {
    if (open) reset(buildDefaultValues(item))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, item])

  function onSubmit(values) {
    const nome = values.nome.trim()
    if (!nome) {
      showToast('Preencha o nome do programa.', 'danger')
      return
    }

    const urlDownload = values.urlDownload.trim()
    if (urlDownload && !isHttpUrl(urlDownload)) {
      showToast('O link de download deve ser uma URL http(s) válida.', 'danger')
      return
    }

    const record = {
      nome,
      categoria: values.categoria,
      versao: values.versao.trim(),
      arquitetura: values.arquitetura,
      tamanho: values.tamanho.trim(),
      desenvolvedor: values.desenvolvedor.trim(),
      dataAtualizacao: values.dataAtualizacao,
      urlDownload,
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
        <FormField label="Nome do programa" required htmlFor="i_nome">
          <Input id="i_nome" placeholder="Ex: AnyDesk" {...register('nome')} />
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
          <Input id="i_versao" placeholder="Ex: 8.1.2" {...register('versao')} />
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
          <Input id="i_tamanho" placeholder="Ex: 45MB" {...register('tamanho')} />
        </FormField>
        <FormField label="Desenvolvedor" htmlFor="i_desenvolvedor">
          <Input
            id="i_desenvolvedor"
            placeholder="Ex: AnyDesk Software GmbH"
            {...register('desenvolvedor')}
          />
        </FormField>
        <FormField label="Última atualização" htmlFor="i_dataAtualizacao">
          <Input id="i_dataAtualizacao" type="date" {...register('dataAtualizacao')} />
        </FormField>
        <FormField label="Link de download" htmlFor="i_urlDownload">
          <Input
            id="i_urlDownload"
            placeholder="URL do arquivo (Supabase Storage, rede interna...)"
            {...register('urlDownload')}
          />
        </FormField>
        <FormField label="Observações" full htmlFor="i_observacoes">
          <Input
            id="i_observacoes"
            placeholder="Ex: usar apenas a versão MSI para instalação silenciosa"
            {...register('observacoes')}
          />
        </FormField>
      </FormGrid>
    </Modal>
  )
}
