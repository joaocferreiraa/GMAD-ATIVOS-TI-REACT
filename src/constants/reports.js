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
  MonitorIcon,
  PackageIcon,
  NetworkMonitorIcon,
  BellIcon,
  PrinterIcon,
} from '../components/ui/Icon/icons'
import { CATEGORIES, CAT_LABEL_PLURAL } from './categories'
import { STOCK_TIPOS } from './stock'
import { INSTALLER_CATEGORIAS } from './installers'
import { SCRIPT_CATEGORIAS, SCRIPT_TIPOS } from './scripts'
import { INFRA_UNIT_NAMES } from './infra'
import { FIELD_GROUPS } from './fieldGroups'
import { getUnidades } from '../utils/units'
import { getUsuarios } from '../utils/assetsFilter'
import { getContatoDepartamentos } from '../utils/contatosFilter'
import { fmtDate, fmtMoney, unitDisplayName, assetWarrantyInfo } from '../utils/formatters'
import { fmtBytes } from '../utils/hostFormatters'
import { montarCatalogo } from '../utils/catalogoSoftware'
import {
  TICKET_STATUSES,
  TICKET_PRIORITIES,
  TICKET_CATEGORIES,
  FINAL_STATUSES,
  formatTicketNumber,
} from '../config/itConfig'

// A origem não tem um rótulo pronto fora do badge da Central de Chamados
// (itBadges.jsx é componente de UI, não faz sentido importar aqui).
const TICKET_SOURCE_LABELS = { whatsapp: 'WhatsApp', painel: 'Painel' }

// Data/hora completa (chamados guardam timestamp, não só data — diferente
// do fmtDate acima, que espera "AAAA-MM-DD" e quebraria num ISO com hora).
const fmtDateTime = (v) => (v ? new Date(v).toLocaleString('pt-BR') : '—')

const fmtSimNao = (v) => (v ? 'Sim' : 'Não')

// Severidades de alerta de rede (ver computeMonitorStatus / TvPage), que não
// têm um mapa de rótulos próprio no domínio — só o texto em caixa alta do
// painel de parede, que não serve pra uma célula de tabela.
const ALERT_SEVERIDADES = { problema: 'Problema', atencao: 'Atenção' }

// Opções de filtro tiradas dos PRÓPRIOS dados, para campos sem lista fixa
// no domínio (fabricante de máquina, versão de SO, domínio de rede) — não
// há constante possível aí, é o que os agentes reportarem.
function valoresUnicos(lista, chave) {
  return [...new Set((lista ?? []).map((item) => item[chave]).filter(Boolean))].sort((a, b) =>
    String(a).localeCompare(String(b), 'pt-BR'),
  )
}

// Colunas técnicas do relatório de Ativos: a união dos campos específicos de
// categoria (ver FIELD_GROUPS). São ~20 colunas e só valem para uma
// categoria cada — uma linha de Celular não tem "Resolução" —, por isso
// entram com `defaultOff`: existem no seletor de colunas, mas o relatório
// abre sem elas. Sem isso, abrir Ativos jogaria 30 colunas na tela, quase
// todas vazias.
//
// FIELD_GROUPS.Notebook é o MESMO array de Desktop (atribuição por
// referência lá na constante), e `modelo` já é coluna própria — daí o
// controle de repetidos.
const ASSET_SPEC_COLUMNS = (() => {
  const vistos = new Set(['modelo'])
  const colunas = []
  for (const campos of Object.values(FIELD_GROUPS)) {
    for (const f of campos) {
      if (vistos.has(f.key)) continue
      vistos.add(f.key)
      colunas.push({
        key: f.key,
        label: f.label,
        defaultOff: true,
        ...(f.type === 'date' ? { format: fmtDate } : {}),
      })
    }
  }
  return colunas
})()

// Definições dos relatórios da Central de Relatórios — porta 1:1 do array
// REPORTS do sistema original, com duas diferenças de forma (não de
// comportamento): `icon` aponta direto para o componente de ícone já usado
// pelo item de menu do módulo correspondente (em vez de uma string
// repassada a uma função icon()), e `buildRows(data)` substitui `getRows()`
// — já que no React os dados de cada módulo vêm de hooks carregados de uma
// vez só (o "data" bag: { assets, stock, contatos, installers, scripts,
// wifi, construshow, logEntries, chamados, inventario, dispositivos, monitores, alertas,
// softwareParque }), em vez de variáveis globais lidas sob demanda.
//
// Duas convenções que os relatórios podem usar:
//   `defaultOff` numa coluna — ela existe no seletor mas o relatório abre
//   sem ela. Para colunas que só valem pra parte das linhas (campos
//   técnicos por categoria de ativo) ou que são longas demais pra abrir por
//   padrão (lista de máquinas de um programa).
//
//   `lazy: { dataKey, label, hint }` no relatório — os dados dele NÃO vêm
//   com o resto e só são buscados quando a pessoa pede. Hoje só o catálogo
//   de software usa: são ~60 programas por máquina e puxar isso de todo o
//   parque ao abrir a Central seria megabytes de JSON para um relatório que
//   talvez nem seja aberto.
export const REPORT_DEFS = [
  {
    key: 'painel',
    title: 'Painel Geral',
    desc: 'Indicadores gerais do parque de TI.',
    icon: DashboardIcon,
    columns: [
      { key: 'bloco', label: 'Bloco' },
      { key: 'metrica', label: 'Métrica' },
      { key: 'valor', label: 'Valor' },
    ],
    filters: [],
    // Um retrato do sistema INTEIRO, não só do parque de ativos: é o
    // relatório que se manda pra quem não abre o painel. A coluna "Bloco"
    // agrupa as linhas por módulo — sem ela, 30 métricas soltas viram uma
    // lista que ninguém lê até o fim.
    buildRows: (data) => {
      const invest = data.assets.reduce((s, a) => s + (parseFloat(a.preco) || 0), 0)
      const garantias = data.assets.map((a) => assetWarrantyInfo(a).cls)
      const abertos = data.chamados.filter((t) => !FINAL_STATUSES.includes(t.status))
      const avaliados = data.chamados.filter((t) => t.rating)

      const linha = (bloco, metrica, valor) => ({ bloco, metrica, valor: String(valor) })

      return [
        linha('Parque', 'Total de ativos', data.assets.length),
        ...CATEGORIES.map((c) =>
          linha('Parque', CAT_LABEL_PLURAL[c], data.assets.filter((a) => a.categoria === c).length),
        ),
        linha('Parque', 'Unidades', getUnidades(data.assets).length),
        linha('Parque', 'Valor investido', fmtMoney(invest)),

        linha(
          'Situação',
          'Ativos em manutenção',
          data.assets.filter((a) => a.status === 'Manutenção').length,
        ),
        linha(
          'Situação',
          'Ativos inativos',
          data.assets.filter((a) => a.status === 'Inativo').length,
        ),
        linha(
          'Situação',
          'Sem etiqueta física',
          data.assets.filter((a) => a.etiqueta !== 'Possui').length,
        ),
        linha(
          'Situação',
          'Sem data de aquisição',
          data.assets.filter((a) => !a.dataAquisicao).length,
        ),

        // Reaproveita a regra de garantia da tela de Ativos, que já sabe da
        // exceção das impressoras alugadas — recontar aqui à mão daria
        // números diferentes dos que o painel mostra.
        linha('Garantias', 'Vencendo em até 60 dias', garantias.filter((c) => c === 'warn').length),
        linha('Garantias', 'Vencidas', garantias.filter((c) => c === 'expired').length),
        linha(
          'Garantias',
          'Sem garantia cadastrada',
          garantias.filter((c) => c === 'missing').length,
        ),

        linha('Pessoas', 'Colaboradores cadastrados', data.contatos.length),

        linha('Estoque', 'Itens cadastrados', data.stock.length),
        linha('Estoque', 'Em falta', data.stock.filter((s) => s.status === 'Em falta').length),
        linha(
          'Estoque',
          'Baixo estoque',
          data.stock.filter((s) => s.status === 'Baixo estoque').length,
        ),

        linha('Chamados', 'Total registrado', data.chamados.length),
        linha('Chamados', 'Em aberto', abertos.length),
        linha(
          'Chamados',
          'Resolvidos',
          data.chamados.filter((t) => t.status === 'resolvido').length,
        ),
        linha(
          'Chamados',
          'Avaliação média',
          avaliados.length
            ? `${(avaliados.reduce((s, t) => s + t.rating, 0) / avaliados.length).toFixed(1)}/5`
            : '—',
        ),

        linha('Inventário', 'Máquinas com agente', data.inventario.length),
        linha(
          'Inventário',
          'Com acesso remoto (RustDesk)',
          data.inventario.filter((m) => m.rustdeskInstalado).length,
        ),

        linha('Rede', 'Equipamentos descobertos', data.dispositivos.length),
        linha('Rede', 'Pontos monitorados', data.monitores.length),
        linha('Rede', 'Pontos ativos', data.monitores.filter((m) => m.ativo !== false).length),
        linha('Rede', 'Alertas em aberto', data.alertas.filter((a) => !a.resolvido).length),

        linha('Infraestrutura', 'Redes Wi-Fi cadastradas', data.wifi.length),
        linha('Infraestrutura', 'Instaladores homologados', data.installers.length),
        linha('Infraestrutura', 'Scripts na biblioteca', data.scripts.length),
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
      {
        key: 'etiqueta',
        label: 'Etiqueta física',
        format: (v) => (v === 'Possui' ? 'Possui' : '—'),
      },
      { key: 'posse', label: 'Situação', format: (v) => v || '—' },
      { key: 'dataAquisicao', label: 'Aquisição', format: fmtDate },
      { key: 'garantiaAte', label: 'Garantia', format: fmtDate },
      {
        key: 'preco',
        label: 'Preço / Aluguel',
        format: (v, r) =>
          r?.posse === 'Alugado' ? `${fmtMoney(r.valorAluguel)}/mês` : fmtMoney(v),
      },
      { key: 'observacoes', label: 'Observações', defaultOff: true },
      ...ASSET_SPEC_COLUMNS,
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
    key: 'inventario',
    title: 'Inventário de máquinas',
    desc: 'Hardware e sistema operacional coletados pelo agente em cada PC.',
    icon: MonitorIcon,
    // Complementa "Ativos Cadastrados", não substitui: lá está o que o TI
    // cadastrou à mão (patrimônio, responsável, nota fiscal); aqui, o que a
    // máquina informa de si mesma. Uma máquina pode existir num e não no
    // outro — é justamente o cruzamento que revela PC sem cadastro.
    columns: [
      { key: 'hostname', label: 'Hostname' },
      { key: 'usuarioLogado', label: 'Usuário logado' },
      { key: 'dominio', label: 'Domínio' },
      { key: 'fabricante', label: 'Fabricante' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'numeroSerie', label: 'Número de série' },
      { key: 'tipoChassi', label: 'Tipo', defaultOff: true },
      { key: 'soNome', label: 'Sistema operacional' },
      { key: 'soVersao', label: 'Versão do SO' },
      { key: 'soBuild', label: 'Build', defaultOff: true },
      { key: 'soArquitetura', label: 'Arquitetura', defaultOff: true },
      { key: 'cpuModelo', label: 'Processador' },
      { key: 'cpuNucleos', label: 'Núcleos', defaultOff: true },
      { key: 'cpuThreads', label: 'Threads', defaultOff: true },
      { key: 'ramTotalBytes', label: 'Memória RAM', format: fmtBytes },
      { key: 'discoTotalBytes', label: 'Disco total', format: fmtBytes },
      { key: 'discoLivreBytes', label: 'Disco livre', format: fmtBytes },
      { key: 'rustdeskInstalado', label: 'Acesso remoto', format: fmtSimNao },
      { key: 'rustdeskId', label: 'ID RustDesk', defaultOff: true },
      { key: 'agenteVersao', label: 'Versão do agente', defaultOff: true },
      { key: 'coletadoEm', label: 'Última coleta', format: fmtDateTime },
    ],
    filters: [
      {
        key: 'soNome',
        label: 'Sistema operacional',
        allLabel: 'Todos os sistemas',
        options: (data) => valoresUnicos(data.inventario, 'soNome'),
      },
      {
        key: 'fabricante',
        label: 'Fabricante',
        allLabel: 'Todos os fabricantes',
        options: (data) => valoresUnicos(data.inventario, 'fabricante'),
      },
      {
        key: 'dominio',
        label: 'Domínio',
        allLabel: 'Todos os domínios',
        options: (data) => valoresUnicos(data.inventario, 'dominio'),
      },
    ],
    buildRows: (data) => data.inventario,
  },
  {
    key: 'software',
    title: 'Catálogo de software',
    desc: 'Programas instalados no parque, por número de instalações.',
    icon: PackageIcon,
    // CARREGAMENTO SOB DEMANDA (ver `lazy`): a lista de programas não vem
    // junto com o inventário porque são ~60 por máquina — puxar de todas as
    // máquinas ao abrir a Central de Relatórios seriam megabytes de JSON
    // para um relatório que talvez ninguém abra naquela visita.
    lazy: {
      dataKey: 'softwareParque',
      label: 'Carregar catálogo de software',
      hint: 'A lista de programas de cada máquina é grande e só é buscada quando você pede.',
    },
    columns: [
      { key: 'nome', label: 'Programa' },
      { key: 'fabricante', label: 'Fabricante' },
      { key: 'instalacoes', label: 'Instalações' },
      { key: 'versoes', label: 'Versões encontradas' },
      { key: 'versaoDivergente', label: 'Versões diferentes' },
      { key: 'licenca', label: 'Produto licenciado' },
      { key: 'atencao', label: 'Requer atenção' },
      { key: 'motivo', label: 'Motivo da atenção' },
      { key: 'maquinas', label: 'Máquinas', defaultOff: true },
    ],
    filters: [
      {
        key: 'atencao',
        label: 'Atenção',
        allLabel: 'Todos os programas',
        options: () => ['Sim', 'Não'],
      },
      {
        key: 'versaoDivergente',
        label: 'Versões diferentes',
        allLabel: 'Tanto faz',
        // 'Sim'/'Não' e não booleano: computeReportRows filtra comparando
        // string, e com booleano o "Não" cairia no mesmo ramo de "todos".
        options: () => ['Sim', 'Não'],
      },
    ],
    // O catálogo é montado com a MESMA função da tela (montarCatalogo), pra
    // relatório e tela nunca discordarem sobre o que "requer atenção".
    buildRows: (data) =>
      montarCatalogo(data.softwareParque).map((item) => ({
        nome: item.nome,
        fabricante: item.fabricante || '—',
        instalacoes: item.instalacoes,
        versoes: item.versoes.map((v) => v.versao).join(', ') || '—',
        versaoDivergente: item.versaoDivergente ? 'Sim' : 'Não',
        licenca: item.licenca?.rotulo || '—',
        atencao: item.atencao ? 'Sim' : 'Não',
        motivo: item.atencao?.motivo || '—',
        maquinas: item.maquinas.map((m) => m.hostname).join(', '),
      })),
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
    key: 'monitores',
    title: 'Pontos monitorados',
    desc: 'Pontos de rede vigiados e os limites configurados em cada um.',
    icon: NetworkMonitorIcon,
    columns: [
      { key: 'nome', label: 'Ponto' },
      { key: 'host', label: 'IP / Host' },
      { key: 'tipo', label: 'Tipo' },
      { key: 'unidade', label: 'Unidade', format: unitDisplayName },
      { key: 'monitorando', label: 'Monitorando' },
      { key: 'intervaloSegundos', label: 'Intervalo', format: (v) => (v ? `${v}s` : '—') },
      { key: 'latenciaMax', label: 'Limite de latência', format: (v) => (v ? `${v} ms` : '—') },
      {
        key: 'packetLossMax',
        label: 'Limite de perda',
        format: (v) => (v || v === 0 ? `${v}%` : '—'),
      },
      {
        key: 'downloadMin',
        label: 'Download mínimo',
        defaultOff: true,
        format: (v) => (v ? `${v} Mbps` : '—'),
      },
      {
        key: 'uploadMin',
        label: 'Upload mínimo',
        defaultOff: true,
        format: (v) => (v ? `${v} Mbps` : '—'),
      },
      { key: 'falhasLimite', label: 'Falhas até alertar', defaultOff: true },
      { key: 'descricao', label: 'Descrição', defaultOff: true },
    ],
    filters: [
      {
        key: 'monitorando',
        label: 'Monitorando',
        allLabel: 'Todos os pontos',
        options: () => ['Sim', 'Não'],
      },
      {
        key: 'tipo',
        label: 'Tipo',
        allLabel: 'Todos os tipos',
        options: (data) => valoresUnicos(data.monitores, 'tipo'),
      },
    ],
    // Duas normalizações aqui, ambas por causa de computeReportRows, que
    // filtra comparando STRING: os limites vivem aninhados em `thresholds`
    // (a tabela lê uma chave por coluna, sem caminho aninhado), e `ativo` é
    // booleano — como filtro booleano, "Não" seria indistinguível de "todos"
    // (ambos caem no ramo falsy) e "Sim" nunca casaria com a string da
    // linha. Vira 'Sim'/'Não' já aqui.
    buildRows: (data) =>
      data.monitores.map((m) => ({
        ...m,
        monitorando: m.ativo === false ? 'Não' : 'Sim',
        latenciaMax: m.thresholds?.latenciaMaximaMs ?? null,
        packetLossMax: m.thresholds?.packetLossMaximoPct ?? null,
        downloadMin: m.thresholds?.downloadMinimoMbps ?? null,
        uploadMin: m.thresholds?.uploadMinimoMbps ?? null,
        falhasLimite: m.thresholds?.falhasConsecutivasLimite ?? null,
      })),
  },
  {
    key: 'dispositivos',
    title: 'Equipamentos de rede',
    desc: 'Impressoras, câmeras e switches descobertos pela varredura.',
    icon: PrinterIcon,
    // O complemento do Inventário: lá está o que RODA o agente; aqui, o que
    // não roda e só é visto de fora, pela varredura. Junto com Ativos, é o
    // terceiro ângulo sobre a mesma rede — e o único que enxerga um
    // equipamento que ninguém cadastrou nem instalou nada.
    columns: [
      { key: 'ip', label: 'IP' },
      { key: 'tipo', label: 'Tipo', format: (v) => v || 'Desconhecido' },
      { key: 'nomeDns', label: 'Nome DNS' },
      { key: 'modelo', label: 'Modelo' },
      { key: 'local', label: 'Local' },
      { key: 'responde', label: 'Responde ping' },
      { key: 'portas', label: 'Portas abertas', format: (v) => (v?.length ? v.join(', ') : '—') },
      { key: 'identificacaoOrigem', label: 'Identificado por', defaultOff: true },
      { key: 'vistoEm', label: 'Visto pela última vez', format: fmtDateTime },
    ],
    filters: [
      {
        key: 'tipo',
        label: 'Tipo',
        allLabel: 'Todos os tipos',
        options: (data) => valoresUnicos(data.dispositivos, 'tipo'),
      },
      {
        key: 'responde',
        label: 'Responde ping',
        allLabel: 'Todos os equipamentos',
        options: () => ['Sim', 'Não'],
      },
    ],
    // `responde` como string pelo mesmo motivo dos outros relatórios: o
    // filtro compara string, e um booleano quebraria o "Não".
    buildRows: (data) =>
      data.dispositivos.map((d) => ({
        ...d,
        responde: d.respondePing === false ? 'Não' : 'Sim',
      })),
  },
  {
    key: 'alertas',
    title: 'Alertas de rede',
    desc: 'Histórico de alertas disparados pelo monitoramento.',
    icon: BellIcon,
    columns: [
      { key: 'ponto', label: 'Ponto' },
      { key: 'severidade', label: 'Severidade', format: (v) => ALERT_SEVERIDADES[v] ?? v },
      { key: 'mensagem', label: 'Mensagem' },
      { key: 'valorAtual', label: 'Valor medido', defaultOff: true },
      { key: 'valorLimite', label: 'Limite', defaultOff: true },
      { key: 'situacao', label: 'Situação' },
      { key: 'createdAt', label: 'Aberto em', format: fmtDateTime },
      { key: 'resolvedAt', label: 'Resolvido em', format: fmtDateTime },
    ],
    filters: [
      {
        key: 'severidade',
        label: 'Severidade',
        allLabel: 'Todas as severidades',
        options: () => Object.keys(ALERT_SEVERIDADES),
        optionLabel: (v) => ALERT_SEVERIDADES[v] ?? v,
      },
      {
        key: 'situacao',
        label: 'Situação',
        allLabel: 'Abertos e resolvidos',
        options: () => ['Em aberto', 'Resolvido'],
      },
    ],
    // O alerta guarda o uid do ponto, não o nome. Um ponto excluído depois
    // do alerta deixa o uid órfão — mostrar "Ponto removido" preserva a
    // linha do histórico em vez de exibir um uid cru sem sentido.
    buildRows: (data) => {
      const nomePorUid = Object.fromEntries(data.monitores.map((m) => [m.uid, m.nome]))
      return data.alertas.map((a) => ({
        ...a,
        ponto: nomePorUid[a.monitorUid] || 'Ponto removido',
        situacao: a.resolvido ? 'Resolvido' : 'Em aberto',
      }))
    },
  },
  {
    key: 'unidades',
    title: 'Unidades',
    desc: 'Resumo de ativos e investimento por unidade.',
    icon: UnitsIcon,
    columns: [
      { key: 'unidade', label: 'Unidade' },
      { key: 'total', label: 'Total de ativos' },
      { key: 'manutencao', label: 'Em manutenção' },
      { key: 'semEtiqueta', label: 'Sem etiqueta' },
      { key: 'colaboradores', label: 'Colaboradores' },
      { key: 'itensEstoque', label: 'Itens em estoque' },
      { key: 'valor', label: 'Valor investido' },
      { key: 'valorMedio', label: 'Valor médio por ativo' },
    ],
    filters: [],
    // As unidades saem dos ATIVOS: é a lista canônica do sistema (mesma de
    // getUnidades no dashboard). Contatos e estoque são contados por essa
    // mesma chave, então uma unidade que só tenha colaboradores e nenhum
    // ativo não aparece — o que é raro e coerente com o resto do painel.
    buildRows: (data) =>
      getUnidades(data.assets).map((u) => {
        const scoped = data.assets.filter((a) => a.unidade === u)
        const invest = scoped.reduce((s, a) => s + (parseFloat(a.preco) || 0), 0)
        return {
          unidade: unitDisplayName(u),
          total: scoped.length,
          manutencao: scoped.filter((a) => a.status === 'Manutenção').length,
          semEtiqueta: scoped.filter((a) => a.etiqueta !== 'Possui').length,
          colaboradores: data.contatos.filter((c) => c.unidade === u).length,
          itensEstoque: data.stock.filter((s) => s.unidade === u).length,
          valor: fmtMoney(invest),
          valorMedio: fmtMoney(scoped.length ? invest / scoped.length : 0),
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
