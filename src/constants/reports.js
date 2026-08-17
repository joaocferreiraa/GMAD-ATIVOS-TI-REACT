import {
  DashboardIcon,
  AssetsIcon,
  ContactsIcon,
  StockIcon,
  DownloadIcon,
  ScriptsIcon,
  UnitsIcon,
  ClockIcon,
  WifiIcon,
  ServerIcon,
  TicketIcon,
} from '../components/ui/Icon/icons'
import { CATEGORIES, CAT_LABEL_PLURAL } from './categories'
import { STOCK_TIPOS } from './stock'
import { INSTALLER_CATEGORIAS } from './installers'
import { SCRIPT_CATEGORIAS, SCRIPT_TIPOS } from './scripts'
import { INFRA_UNIT_NAMES } from './infra'
import { getUnidades } from '../utils/units'
import { getUsuarios } from '../utils/assetsFilter'
import { getContatoDepartamentos } from '../utils/contatosFilter'
import { fmtDate, fmtMoney, unitDisplayName } from '../utils/formatters'
import { TICKET_STATUSES, TICKET_PRIORITIES, TICKET_CATEGORIES, formatTicketNumber } from '../config/itConfig'

// A origem não tem um rótulo pronto fora do badge da Central de Chamados
// (itBadges.jsx é componente de UI, não faz sentido importar aqui).
const TICKET_SOURCE_LABELS = { whatsapp: 'WhatsApp', painel: 'Painel' }

// Data/hora completa (chamados guardam timestamp, não só data — diferente
// do fmtDate acima, que espera "AAAA-MM-DD" e quebraria num ISO com hora).
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('pt-BR') : '—')

// Definições dos relatórios da Central de Relatórios — porta 1:1 do array
// REPORTS do sistema original, com duas diferenças de forma (não de
// comportamento): `icon` aponta direto para o componente de ícone já usado
// pelo item de menu do módulo correspondente (em vez de uma string
// repassada a uma função icon()), e `buildRows(data)` substitui `getRows()`
// — já que no React os dados de cada módulo vêm de hooks carregados de uma
// vez só (o "data" bag: { assets, stock, contatos, installers, scripts,
// wifi, construshow, logEntries, chamados }), em vez de variáveis globais
// lidas sob demanda.
export const REPORT_DEFS = [
  {
    key: 'painel',
    title: 'Painel Geral',
    desc: 'Indicadores gerais do parque de TI.',
    icon: DashboardIcon,
    columns: [
      { key: 'metrica', label: 'Métrica' },
      { key: 'valor', label: 'Valor' },
    ],
    filters: [],
    buildRows: (data) => {
      const invest = data.assets.reduce((s, a) => s + (parseFloat(a.preco) || 0), 0)
      return [
        { metrica: 'Total de ativos', valor: String(data.assets.length) },
        ...CATEGORIES.map((c) => ({
          metrica: CAT_LABEL_PLURAL[c],
          valor: String(data.assets.filter((a) => a.categoria === c).length),
        })),
        { metrica: 'Unidades', valor: String(getUnidades(data.assets).length) },
        { metrica: 'Valor investido', valor: fmtMoney(invest) },
      ]
    },
  },
  {
    key: 'chamados',
    title: 'Chamados',
    desc: 'Histórico de chamados abertos pela equipe de TI.',
    icon: TicketIcon,
    columns: [
      { key: 'numero', label: 'Nº' },
      { key: 'titulo', label: 'Título' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'prioridade', label: 'Prioridade', format: (v) => TICKET_PRIORITIES[v]?.label ?? v },
      { key: 'status', label: 'Status', format: (v) => TICKET_STATUSES[v]?.label ?? v },
      { key: 'solicitante', label: 'Solicitante' },
      { key: 'responsavel', label: 'Atribuído a' },
      { key: 'setor', label: 'Setor' },
      { key: 'unidade', label: 'Unidade', format: unitDisplayName },
      { key: 'equipamento', label: 'Equipamento relacionado' },
      { key: 'origem', label: 'Origem', format: (v) => TICKET_SOURCE_LABELS[v] ?? v },
      { key: 'avaliacao', label: 'Avaliação', format: (v) => (v ? `${v}/5` : '—') },
      { key: 'abertoEm', label: 'Aberto em', format: fmtDateTime },
      { key: 'resolvidoEm', label: 'Resolvido em', format: fmtDateTime },
    ],
    filters: [
      {
        key: 'status',
        label: 'Status',
        allLabel: 'Todos os status',
        options: () => Object.keys(TICKET_STATUSES),
        optionLabel: (v) => TICKET_STATUSES[v]?.label ?? v,
      },
      {
        key: 'prioridade',
        label: 'Prioridade',
        allLabel: 'Todas as prioridades',
        options: () => Object.keys(TICKET_PRIORITIES),
        optionLabel: (v) => TICKET_PRIORITIES[v]?.label ?? v,
      },
      {
        key: 'categoria',
        label: 'Categoria',
        allLabel: 'Todas as categorias',
        options: () => TICKET_CATEGORIES,
      },
      {
        key: 'unidade',
        label: 'Unidade',
        allLabel: 'Todas as unidades',
        options: (data) => getUnidades(data.assets),
        optionLabel: unitDisplayName,
      },
    ],
    buildRows: (data) =>
      data.chamados.map((t) => {
        const asset = t.asset_id ? data.assets.find((a) => a.id === t.asset_id) : null
        return {
          numero: formatTicketNumber(t.ticket_number),
          titulo: t.title,
          categoria: t.category,
          prioridade: t.priority,
          status: t.status,
          solicitante: t.requester_name || t.requester || '—',
          responsavel: t.assignee_name || t.assignee || '—',
          setor: t.department || '—',
          unidade: t.unit || '',
          equipamento: asset
            ? [asset.categoria, asset.modelo, asset.usuario && `(${asset.usuario})`]
                .filter(Boolean)
                .join(' ')
            : t.asset_id || '—',
          origem: t.source,
          avaliacao: t.rating,
          abertoEm: t.created_at,
          resolvidoEm: t.resolved_at,
        }
      }),
  },
  {
    key: 'ativos',
    title: 'Ativos Cadastrados',
    desc: 'Inventário completo dos equipamentos de TI.',
    icon: AssetsIcon,
    columns: [
      { key: 'id', label: 'Patrimônio' },
      { key: 'modelo', label: 'Nome / Modelo' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'usuario', label: 'Responsável' },
      { key: 'unidade', label: 'Unidade', format: unitDisplayName },
      { key: 'departamento', label: 'Departamento' },
      { key: 'status', label: 'Status' },
      { key: 'dataAquisicao', label: 'Aquisição', format: fmtDate },
      { key: 'garantiaAte', label: 'Garantia', format: fmtDate },
      {
        key: 'preco',
        label: 'Preço / Aluguel',
        format: (v, r) => (r?.posse === 'Alugado' ? `${fmtMoney(r.valorAluguel)}/mês` : fmtMoney(v)),
      },
    ],
    filters: [
      {
        key: 'unidade',
        label: 'Unidade',
        allLabel: 'Todas as unidades',
        options: (data) => getUnidades(data.assets),
        optionLabel: unitDisplayName,
      },
      {
        key: 'categoria',
        label: 'Categoria',
        allLabel: 'Todas as categorias',
        options: () => CATEGORIES,
      },
      {
        key: 'status',
        label: 'Status',
        allLabel: 'Todos os status',
        options: () => ['Ativo', 'Manutenção', 'Inativo'],
      },
      {
        key: 'usuario',
        label: 'Responsável',
        allLabel: 'Todos os responsáveis',
        options: (data) => getUsuarios(data.assets),
      },
    ],
    buildRows: (data) => data.assets,
  },
  {
    key: 'contatos',
    title: 'Contatos',
    desc: 'Diretório de colaboradores por departamento.',
    icon: ContactsIcon,
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'unidade', label: 'Unidade', format: unitDisplayName },
      { key: 'departamento', label: 'Departamento' },
      { key: 'celular', label: 'Celular corporativo' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'ramal', label: 'Ramal' },
      { key: 'email', label: 'E-mail corporativo' },
    ],
    filters: [
      {
        key: 'unidade',
        label: 'Unidade',
        allLabel: 'Todas as unidades',
        options: (data) => getUnidades(data.contatos),
        optionLabel: unitDisplayName,
      },
      {
        key: 'departamento',
        label: 'Departamento',
        allLabel: 'Todos os departamentos',
        options: (data) => getContatoDepartamentos(data.contatos),
      },
    ],
    buildRows: (data) => data.contatos,
  },
  {
    key: 'estoque',
    title: 'Estoque',
    desc: 'Peças, periféricos e dispositivos em estoque.',
    icon: StockIcon,
    columns: [
      { key: 'tipo', label: 'Tipo' },
      { key: 'item', label: 'Item' },
      { key: 'marcaModelo', label: 'Marca / Modelo' },
      { key: 'quantidade', label: 'Quantidade' },
      { key: 'unidade', label: 'Unidade', format: unitDisplayName },
      { key: 'status', label: 'Status' },
      { key: 'observacoes', label: 'Observações' },
    ],
    filters: [
      { key: 'tipo', label: 'Tipo', allLabel: 'Todos os tipos', options: () => STOCK_TIPOS },
      {
        key: 'status',
        label: 'Status',
        allLabel: 'Todos os status',
        options: () => ['Disponível', 'Baixo estoque', 'Em falta'],
      },
      {
        key: 'unidade',
        label: 'Unidade',
        allLabel: 'Todas as unidades',
        options: (data) => getUnidades(data.assets),
        optionLabel: unitDisplayName,
      },
    ],
    buildRows: (data) => data.stock,
  },
  {
    key: 'instaladores',
    title: 'Instaladores',
    desc: 'Programas homologados pela equipe de TI.',
    icon: DownloadIcon,
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'versao', label: 'Versão' },
      { key: 'arquitetura', label: 'Arquitetura' },
      { key: 'desenvolvedor', label: 'Desenvolvedor' },
      { key: 'dataAtualizacao', label: 'Atualizado em', format: fmtDate },
      { key: 'tamanho', label: 'Tamanho' },
    ],
    filters: [
      {
        key: 'categoria',
        label: 'Categoria',
        allLabel: 'Todas as categorias',
        options: () => INSTALLER_CATEGORIAS,
      },
    ],
    buildRows: (data) => data.installers,
  },
  {
    key: 'scripts',
    title: 'Scripts',
    desc: 'Biblioteca de scripts e automações da equipe.',
    icon: ScriptsIcon,
    columns: [
      { key: 'nome', label: 'Nome' },
      { key: 'categoria', label: 'Categoria' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'versao', label: 'Versão' },
      { key: 'autor', label: 'Autor' },
      { key: 'dataCriacao', label: 'Criado em', format: fmtDate },
      { key: 'dataAtualizacao', label: 'Atualizado em', format: fmtDate },
    ],
    filters: [
      {
        key: 'categoria',
        label: 'Categoria',
        allLabel: 'Todas as categorias',
        options: () => SCRIPT_CATEGORIAS,
      },
      { key: 'tipo', label: 'Tipo', allLabel: 'Todos os tipos', options: () => SCRIPT_TIPOS },
    ],
    buildRows: (data) => data.scripts,
  },
  {
    key: 'wifi',
    title: 'Redes Wi-Fi',
    desc: 'Configurações de rede Wi-Fi cadastradas por unidade.',
    icon: WifiIcon,
    columns: [
      { key: 'unidade', label: 'Unidade' },
      { key: 'redeNome', label: 'Nome da rede' },
      { key: 'ssid', label: 'SSID' },
      { key: 'seguranca', label: 'Tipo de segurança' },
      { key: 'ipInterno', label: 'IP Interno' },
      { key: 'ipExterno', label: 'IP Externo' },
      { key: 'gateway', label: 'Gateway' },
      { key: 'dnsPrimario', label: 'DNS Primário' },
      { key: 'dnsSecundario', label: 'DNS Secundário' },
      { key: 'observacoes', label: 'Observações' },
    ],
    filters: [
      {
        key: 'unidade',
        label: 'Unidade',
        allLabel: 'Todas as unidades',
        options: () => INFRA_UNIT_NAMES,
      },
    ],
    buildRows: (data) => data.wifi,
  },
  {
    key: 'construshow',
    title: 'Construshow (IPs)',
    desc: 'IPs internos e externos do sistema Construshow por unidade.',
    icon: ServerIcon,
    columns: [
      { key: 'unidade', label: 'Unidade' },
      { key: 'ipInterno', label: 'IP Interno' },
      { key: 'ipExterno', label: 'IP Externo' },
    ],
    filters: [
      {
        key: 'unidade',
        label: 'Unidade',
        allLabel: 'Todas as unidades',
        options: () => INFRA_UNIT_NAMES,
      },
    ],
    buildRows: (data) => data.construshow,
  },
  {
    key: 'unidades',
    title: 'Unidades',
    desc: 'Resumo de ativos e investimento por unidade.',
    icon: UnitsIcon,
    columns: [
      { key: 'unidade', label: 'Unidade' },
      { key: 'total', label: 'Total de ativos' },
      { key: 'valor', label: 'Valor investido' },
    ],
    filters: [],
    buildRows: (data) =>
      getUnidades(data.assets).map((u) => {
        const scoped = data.assets.filter((a) => a.unidade === u)
        return {
          unidade: unitDisplayName(u),
          total: scoped.length,
          valor: fmtMoney(scoped.reduce((s, a) => s + (parseFloat(a.preco) || 0), 0)),
        }
      }),
  },
  {
    key: 'atividade',
    title: 'Atividade recente',
    desc: 'Histórico de cadastros, edições e exclusões.',
    icon: ClockIcon,
    columns: [
      {
        key: 'ts',
        label: 'Data/hora',
        format: (v) => (v ? new Date(v).toLocaleString('pt-BR') : '—'),
      },
      { key: 'texto', label: 'Ação' },
      { key: 'por', label: 'Responsável' },
    ],
    filters: [],
    buildRows: (data) => data.logEntries,
  },
]
