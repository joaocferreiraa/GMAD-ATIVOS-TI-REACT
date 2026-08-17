import { useState } from 'react'
import Modal from '../../../components/ui/Modal/Modal'
import Button from '../../../components/ui/Button/Button'
import Input from '../../../components/ui/Input/Input'
import Select from '../../../components/ui/Select/Select'
import FormField, { FormGrid } from '../../../components/ui/FormField/FormField'
import { useData } from '../useItContext'
import { useItToast as useToast } from '../useItContext'
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../../config/itConfig'
import { createTicket } from '../../../services/itService'
import { useAssets } from '../../../hooks/data/useAssets'
import styles from './TicketFormModal.module.css'

const EMPTY_FORM = {
  title: '',
  category: TICKET_CATEGORIES[0],
  priority: 'media',
  description: '',
  department: '',
  location: '',
  assetId: '',
}

const TicketFormModal = ({ isOpen, onClose, onCreated }) => {
  const { username, name, activeUnit, AVAILABLE_UNITS, group } = useData()
  const toast = useToast()

  // O formulário começa limpo a cada abertura porque o pai remonta este
  // componente com key={...} quando isOpen muda — resetar via setState
  // dentro de um effect causaria um render em cascata (e o React Compiler
  // recusa esse padrão).
  const [form, setForm] = useState(() => ({ ...EMPTY_FORM, department: group || '' }))
  const [unitId, setUnitId] = useState(activeUnit || '')
  const [saving, setSaving] = useState(false)

  // Equipamentos vêm do módulo Ativos desta plataforma — é o mesmo parque
  // que a equipe já cadastra, então não faz sentido manter uma lista à parte.
  const { data: assets = [] } = useAssets()

  const setField = (field) => (value) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.description.trim()) {
      toast.warning('Campos obrigatórios', 'Informe o título e a descrição do problema.')
      return
    }
    setSaving(true)
    try {
      const ticket = await createTicket({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        priority: form.priority,
        requester: username,
        requesterName: name,
        department: form.department.trim() || null,
        unitId: unitId || null,
        location: form.location.trim() || null,
        assetId: form.assetId || null,
      })
      toast.success('Chamado aberto', `Seu chamado foi registrado e a equipe de TI será notificada.`)
      onCreated?.(ticket)
      onClose()
    } catch (err) {
      console.error('[TicketFormModal]', err)
      toast.error('Erro ao abrir chamado', err.message)
    } finally {
      setSaving(false)
    }
  }

  const priorityCfg = TICKET_PRIORITIES[form.priority]

  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="Novo chamado"
      maxWidth="620px"
      footer={
        <>
          <div />
          <div style={{ display: 'flex', gap: 10 }}>
            <Button onClick={onClose} disabled={saving}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} disabled={saving}>
              {saving ? 'Aguarde...' : 'Abrir chamado'}
            </Button>
          </div>
        </>
      }
    >
      <FormGrid>
        <FormField label="Título" required full htmlFor="t_title">
          <Input
            id="t_title"
            placeholder="Resumo do problema (ex.: Computador não liga)"
            value={form.title}
            onChange={(e) => setField('title')(e.target.value)}
            maxLength={120}
          />
        </FormField>

        <FormField label="Categoria" required htmlFor="t_category">
          <Select
            id="t_category"
            value={form.category}
            onChange={setField('category')}
            options={TICKET_CATEGORIES.map((c) => ({ value: c, label: c }))}
          />
        </FormField>

        <FormField label="Prioridade" required htmlFor="t_priority">
          <Select
            id="t_priority"
            value={form.priority}
            onChange={setField('priority')}
            options={Object.entries(TICKET_PRIORITIES)
              .sort((a, b) => a[1].order - b[1].order)
              .map(([value, cfg]) => ({ value, label: cfg.label }))}
          />
          {priorityCfg && (
            <span className={styles.hint}>
              {priorityCfg.description} · SLA {priorityCfg.slaHours}h
            </span>
          )}
        </FormField>

        <FormField label="Unidade" htmlFor="t_unit">
          <Select
            id="t_unit"
            value={unitId}
            onChange={setUnitId}
            options={[
              { value: '', label: 'Não informada' },
              ...(AVAILABLE_UNITS || []).map((u) => ({ value: u.id, label: u.name })),
            ]}
          />
        </FormField>
        <FormField label="Setor" htmlFor="t_department">
          <Input
            id="t_department"
            placeholder="Ex.: Financeiro, Vendas..."
            value={form.department}
            onChange={(e) => setField('department')(e.target.value)}
          />
        </FormField>

        <FormField label="Local físico" htmlFor="t_location">
          <Input
            id="t_location"
            placeholder="Ex.: Sala da contabilidade, balcão 2..."
            value={form.location}
            onChange={(e) => setField('location')(e.target.value)}
          />
        </FormField>
        <FormField label="Equipamento relacionado" htmlFor="t_asset">
          <Select
            id="t_asset"
            value={form.assetId}
            onChange={setField('assetId')}
            options={[
              { value: '', label: 'Nenhum / não sei informar' },
              ...assets.map((a) => ({
                value: a.id,
                label:
                  [a.categoria, a.modelo, a.usuario && `(${a.usuario})`].filter(Boolean).join(' ') ||
                  a.id,
              })),
            ]}
          />
        </FormField>

        <FormField label="Descrição do problema" required full htmlFor="t_description">
          <Input
            as="textarea"
            id="t_description"
            rows={6}
            placeholder="Descreva o que está acontecendo, desde quando, mensagens de erro exibidas e o que você já tentou fazer."
            value={form.description}
            onChange={(e) => setField('description')(e.target.value)}
          />
        </FormField>
      </FormGrid>
    </Modal>
  )
}

export default TicketFormModal
