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
import {
  MONITOR_TIPOS,
  DEFAULT_THRESHOLDS,
  DEFAULT_INTERVALO_SEGUNDOS,
} from '../../../constants/monitoramento'
import { useToast } from '../../../hooks/useToast'
import modalStyles from '../../ui/Modal/Modal.module.css'
import styles from './MonitorFormModal.module.css'

const TIPO_OPTIONS = MONITOR_TIPOS.map((t) => ({ value: t, label: t }))

const monitorSchema = z
  .object({
    nome: z.string().trim().min(1, 'Informe o nome do ponto.'),
    host: z.string().trim().min(1, 'Informe o IP ou host.'),
    unidade: z.string().min(1, 'Selecione a unidade.'),
  })
  .loose()

function buildDefaultValues(item) {
  const t = { ...DEFAULT_THRESHOLDS, ...(item?.thresholds || {}) }
  return {
    nome: item?.nome || '',
    host: item?.host || '',
    tipo: item?.tipo || 'Servidor',
    unidade: item?.unidade || '',
    descricao: item?.descricao || '',
    intervaloSegundos: item?.intervaloSegundos ?? DEFAULT_INTERVALO_SEGUNDOS,
    ativo: item?.ativo ?? true,
    latenciaMaximaMs: t.latenciaMaximaMs,
    packetLossMaximoPct: t.packetLossMaximoPct,
    downloadMinimoMbps: t.downloadMinimoMbps,
    uploadMinimoMbps: t.uploadMinimoMbps,
    falhasConsecutivasLimite: t.falhasConsecutivasLimite,
  }
}

// Formulário de cadastro/edição de um ponto monitorado. `item` null = novo
// ponto. A Unidade vem do cadastro de Ativos (getUnidades(assets)), mesmo
// padrão do resto do sistema — evita duplicar a lista de unidades.
export default function MonitorFormModal({ open, item, assets, onClose, onSave, onDelete }) {
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
    resolver: zodResolver(monitorSchema),
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
      nome: values.nome.trim(),
      host: values.host.trim(),
      tipo: values.tipo,
      unidade: values.unidade,
      descricao: values.descricao.trim(),
      intervaloSegundos: Number(values.intervaloSegundos) || DEFAULT_INTERVALO_SEGUNDOS,
      ativo: values.ativo,
      thresholds: {
        latenciaMaximaMs: Number(values.latenciaMaximaMs) || 0,
        packetLossMaximoPct: Number(values.packetLossMaximoPct) || 0,
        downloadMinimoMbps: Number(values.downloadMinimoMbps) || 0,
        uploadMinimoMbps: Number(values.uploadMinimoMbps) || 0,
        falhasConsecutivasLimite:
          Number(values.falhasConsecutivasLimite) || DEFAULT_THRESHOLDS.falhasConsecutivasLimite,
      },
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
      title={isEdit ? 'Editar ponto monitorado' : 'Novo ponto monitorado'}
      subtitle={
        isEdit
          ? 'Atualize os dados e limites de alerta deste ponto.'
          : 'Cadastre um servidor, roteador, Wi-Fi ou link de internet para monitorar.'
      }
      footer={
        <>
          <div>
            {isEdit && (
              <Button variant="dangerGhost" onClick={() => onDelete(item)}>
                Excluir ponto
              </Button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" onClick={submit}>
              {isEdit ? 'Salvar alterações' : 'Cadastrar ponto'}
            </Button>
          </div>
        </>
      }
    >
      <FormGrid>
        <FormField label="Nome" required htmlFor="m_nome" error={errors.nome?.message}>
          <Input id="m_nome" placeholder="Ex: Servidor GMAD" {...register('nome')} />
        </FormField>
        <FormField label="IP / Host" required htmlFor="m_host" error={errors.host?.message}>
          <Input id="m_host" placeholder="Ex: 192.168.1.10" {...register('host')} />
        </FormField>
        <FormField label="Tipo" htmlFor="m_tipo">
          <Controller
            control={control}
            name="tipo"
            render={({ field }) => (
              <Select
                id="m_tipo"
                value={field.value}
                onChange={field.onChange}
                options={TIPO_OPTIONS}
              />
            )}
          />
        </FormField>
        <FormField label="Unidade" required htmlFor="m_unidade" error={errors.unidade?.message}>
          <Controller
            control={control}
            name="unidade"
            render={({ field }) => (
              <Select
                id="m_unidade"
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
        <FormField label="Intervalo de monitoramento (segundos)" htmlFor="m_intervalo">
          <Input
            id="m_intervalo"
            type="number"
            inputMode="numeric"
            min={5}
            step={5}
            {...register('intervaloSegundos')}
          />
        </FormField>
        <FormField label="Descrição" full htmlFor="m_descricao">
          <Input id="m_descricao" placeholder="Ex: Servidor principal" {...register('descricao')} />
        </FormField>
      </FormGrid>

      <div className={styles.sectionDivider} />
      <p className={styles.sectionLabel}>
        Limites de alerta — acima/abaixo disso o ponto é classificado como "Problema" (ver
        Monitoramento de Rede).
      </p>
      <FormGrid>
        <FormField label="Latência máxima (ms)" htmlFor="m_latenciaMaxima">
          <Input
            id="m_latenciaMaxima"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            {...register('latenciaMaximaMs')}
          />
        </FormField>
        <FormField label="Packet loss máximo (%)" htmlFor="m_packetLossMaximo">
          <Input
            id="m_packetLossMaximo"
            type="number"
            inputMode="decimal"
            min={0}
            max={100}
            step={0.5}
            {...register('packetLossMaximoPct')}
          />
        </FormField>
        <FormField label="Download mínimo (Mbps)" htmlFor="m_downloadMinimo">
          <Input
            id="m_downloadMinimo"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            {...register('downloadMinimoMbps')}
          />
          <span className={styles.fieldHint}>0 = não avaliar download deste ponto</span>
        </FormField>
        <FormField label="Upload mínimo (Mbps)" htmlFor="m_uploadMinimo">
          <Input
            id="m_uploadMinimo"
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            {...register('uploadMinimoMbps')}
          />
          <span className={styles.fieldHint}>0 = não avaliar upload deste ponto</span>
        </FormField>
        <FormField label="Falhas consecutivas para 'Offline'" htmlFor="m_falhasConsecutivas">
          <Input
            id="m_falhasConsecutivas"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            {...register('falhasConsecutivasLimite')}
          />
        </FormField>
        <FormField full style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="m_ativo" style={{ width: 'auto' }} {...register('ativo')} />
          <label htmlFor="m_ativo" style={{ margin: 0 }}>
            Monitoramento ativo
          </label>
        </FormField>
      </FormGrid>
    </Modal>
  )
}
