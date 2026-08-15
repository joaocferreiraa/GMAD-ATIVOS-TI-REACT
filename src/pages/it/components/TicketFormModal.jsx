import { useState } from 'react';
import '../itTheme.css';
import { Modal } from './itUi';
import { Button } from './itUi';
import { Input } from './itUi';
import { Select } from './itUi';
import { Textarea } from './itUi';
import { useData } from '../useItContext';
import { useItToast as useToast } from '../useItContext';
import { TICKET_CATEGORIES, TICKET_PRIORITIES } from '../../../config/itConfig';
import { createTicket } from '../../../services/itService';
import { useAssets } from '../../../hooks/data/useAssets';

const EMPTY_FORM = {
    title: '',
    category: TICKET_CATEGORIES[0],
    priority: 'media',
    description: '',
    department: '',
    location: '',
    assetId: ''
};

const TicketFormModal = ({ isOpen, onClose, onCreated }) => {
    const { username, name, activeUnit, AVAILABLE_UNITS, group } = useData();
    const toast = useToast();

    // O formulário começa limpo a cada abertura porque o pai remonta este
    // componente com key={...} quando isOpen muda — resetar via setState
    // dentro de um effect causaria um render em cascata (e o React Compiler
    // recusa esse padrão).
    const [form, setForm] = useState(() => ({ ...EMPTY_FORM, department: group || '' }));
    const [unitId, setUnitId] = useState(activeUnit || '');
    const [saving, setSaving] = useState(false);

    // Equipamentos vêm do módulo Ativos desta plataforma — é o mesmo parque
    // que a equipe já cadastra, então não faz sentido manter uma lista à parte.
    const { data: assets = [] } = useAssets();

    const set = (field) => (e) => setForm(prev => ({ ...prev, [field]: e.target.value }));

    const handleSubmit = async () => {
        if (!form.title.trim() || !form.description.trim()) {
            toast.warning('Campos obrigatórios', 'Informe o título e a descrição do problema.');
            return;
        }
        setSaving(true);
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
                assetId: form.assetId || null
            });
            toast.success('Chamado aberto', `Seu chamado foi registrado e a equipe de TI será notificada.`);
            onCreated?.(ticket);
            onClose();
        } catch (err) {
            console.error('[TicketFormModal]', err);
            toast.error('Erro ao abrir chamado', err.message);
        } finally {
            setSaving(false);
        }
    };

    const priorityCfg = TICKET_PRIORITIES[form.priority];

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Novo chamado"
            width="620px"
            footer={
                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end', width: '100%' }}>
                    <Button variant="ghost" onClick={onClose} disabled={saving}>Cancelar</Button>
                    <Button onClick={handleSubmit} isLoading={saving}>Abrir chamado</Button>
                </div>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <Input
                    label="Título"
                    required
                    placeholder="Resumo do problema (ex.: Computador não liga)"
                    value={form.title}
                    onChange={set('title')}
                    maxLength={120}
                />

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <Select
                        label="Categoria"
                        required
                        value={form.category}
                        onChange={set('category')}
                        options={TICKET_CATEGORIES.map(c => ({ value: c, label: c }))}
                    />
                    <Select
                        label="Prioridade"
                        required
                        value={form.priority}
                        onChange={set('priority')}
                        hint={priorityCfg ? `${priorityCfg.description} · SLA ${priorityCfg.slaHours}h` : ''}
                        options={Object.entries(TICKET_PRIORITIES)
                            .sort((a, b) => a[1].order - b[1].order)
                            .map(([value, cfg]) => ({ value, label: cfg.label }))}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <Select
                        label="Unidade"
                        value={unitId}
                        onChange={(e) => setUnitId(e.target.value)}
                        options={[
                            { value: '', label: 'Não informada' },
                            ...(AVAILABLE_UNITS || []).map(u => ({ value: u.id, label: u.name }))
                        ]}
                    />
                    <Input
                        label="Setor"
                        placeholder="Ex.: Financeiro, Vendas..."
                        value={form.department}
                        onChange={set('department')}
                    />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                    <Input
                        label="Local físico"
                        placeholder="Ex.: Sala da contabilidade, balcão 2..."
                        value={form.location}
                        onChange={set('location')}
                    />
                    <Select
                        label="Equipamento relacionado"
                        value={form.assetId}
                        onChange={set('assetId')}
                        options={[
                            { value: '', label: 'Nenhum / não sei informar' },
                            ...assets.map(a => ({
                                value: a.id,
                                label: [a.categoria, a.modelo, a.usuario && `(${a.usuario})`]
                                    .filter(Boolean)
                                    .join(' ') || a.id
                            }))
                        ]}
                    />
                </div>

                <Textarea
                    label="Descrição do problema"
                    required
                    rows={6}
                    placeholder={'Descreva o que está acontecendo, desde quando, mensagens de erro exibidas e o que você já tentou fazer.'}
                    value={form.description}
                    onChange={set('description')}
                />
            </div>
        </Modal>
    );
};

export default TicketFormModal;
