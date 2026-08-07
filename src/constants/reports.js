import {
  DashboardIcon,
  AssetsIcon,
  ContactsIcon,
  StockIcon,
  DownloadIcon,
  ScriptsIcon,
  UnitsIcon,
  ClockIcon,
} from '../components/ui/Icon/icons'
import { CATEGORIES, CAT_LABEL_PLURAL } from './categories'
import { STOCK_TIPOS } from './stock'
import { INSTALLER_CATEGORIAS } from './installers'
import { SCRIPT_CATEGORIAS, SCRIPT_TIPOS } from './scripts'
import { getUnidades } from '../utils/units'
import { getUsuarios } from '../utils/assetsFilter'
import { getContatoDepartamentos } from '../utils/contatosFilter'
import { fmtDate, fmtMoney, unitDisplayName } from '../utils/formatters'

// Definições dos relatórios da Central de Relatórios — porta 1:1 do array
// REPORTS do sistema original, com duas diferenças de forma (não de
// comportamento): `icon` aponta direto para o componente de ícone já usado
// pelo item de menu do módulo correspondente (em vez de uma string
// repassada a uma função icon()), e `buildRows(data)` substitui `getRows()`
// — já que no React os dados de cada módulo vêm de hooks carregados de uma
// vez só (o "data" bag: { assets, stock, contatos, installers, scripts,
// logEntries }), em vez de variáveis globais lidas sob demanda.
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
      { key: 'preco', label: 'Preço', format: fmtMoney },
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
      { key: 'departamento', label: 'Departamento' },
      { key: 'celular', label: 'Celular corporativo' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'ramal', label: 'Ramal' },
      { key: 'email', label: 'E-mail corporativo' },
    ],
    filters: [
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
