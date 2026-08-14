import { unitDisplayName } from './formatters'
import { createSearchMatcher } from './textFilter'

// Consulta (só leitura) o ativo Celular vinculado ao colaborador pelo nome do
// responsável em Ativos Cadastrados — mesmo casamento por nome (sem FK) do
// findCelularAtivo() original, incluindo a fragilidade: renomear o
// colaborador ou digitar o "Usuário" do ativo de forma diferente quebra o
// vínculo silenciosamente.
function findCelularAtivo(assets, nome) {
  if (!nome) return null
  const n = nome.trim().toLowerCase()
  return (
    assets.find(
      (a) => a.categoria === 'Celular' && a.usuario && a.usuario.trim().toLowerCase() === n,
    ) || null
  )
}

// Prioriza o ativo vinculado (modelo + patrimônio); usa o campo manual do
// colaborador como reserva.
export function contatoCelularInfo(assets, contato) {
  const ativo = findCelularAtivo(assets, contato.nome)
  if (ativo)
    return {
      texto: ativo.modelo || 'Não informado',
      patrimonio: ativo.id,
      fromAtivo: true,
      uid: ativo.uid,
    }
  if (contato.celular) return { texto: contato.celular, patrimonio: null, fromAtivo: false }
  return null
}

// Departamentos distintos entre os próprios colaboradores (ao contrário da
// Unidade, que vem do cadastro de Ativos — ver getUnidades() em utils/units).
export function getContatoDepartamentos(colaboradores) {
  const set = new Set(colaboradores.map((c) => c.departamento).filter(Boolean))
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Mapa departamento -> nome do gestor. Se houver mais de um colaborador
// marcado como gestor no mesmo departamento, o último no array vence — mesmo
// comportamento (não validado) do contatoDeptGestorMap() original.
export function contatoDeptGestorMap(colaboradores) {
  const map = {}
  colaboradores.forEach((c) => {
    if (c.isGestor && c.departamento) map[c.departamento] = c.nome
  })
  return map
}

// Lista de colaboradores filtrada e ordenada pela barra de filtros da tela de
// Contatos (equivalente a filteredContatos() no sistema original). `filters`:
// { unidade, departamento, gestor, possuiCelular, possuiTelefone, search,
//   sortKey, sortDir }.
export function filterContatos(colaboradores, assets, filters) {
  let list = colaboradores.slice()
  if (filters.unidade) list = list.filter((c) => c.unidade === filters.unidade)
  if (filters.departamento) list = list.filter((c) => c.departamento === filters.departamento)
  if (filters.gestor === 'sim') list = list.filter((c) => c.isGestor)
  if (filters.gestor === 'nao') list = list.filter((c) => !c.isGestor)
  if (filters.possuiCelular === 'sim') list = list.filter((c) => !!contatoCelularInfo(assets, c))
  if (filters.possuiCelular === 'nao') list = list.filter((c) => !contatoCelularInfo(assets, c))
  if (filters.possuiTelefone === 'sim') list = list.filter((c) => !!c.telefone)
  if (filters.possuiTelefone === 'nao') list = list.filter((c) => !c.telefone)
  if (filters.search) {
    const matches = createSearchMatcher(filters.search)
    list = list.filter((c) => {
      const celInfo = contatoCelularInfo(assets, c)
      return matches([
        c.nome,
        c.departamento,
        c.vendaTipo,
        c.almoxarifadoArea,
        unitDisplayName(c.unidade),
        c.telefone,
        c.email,
        celInfo && celInfo.texto,
      ])
    })
  }

  const gestorMap = contatoDeptGestorMap(colaboradores)
  list = list.slice()
  list.sort((a, b) => {
    const val = (c) => {
      if (filters.sortKey === 'unidade') return unitDisplayName(c.unidade) || ''
      if (filters.sortKey === 'gestor') return gestorMap[c.departamento] || ''
      if (filters.sortKey === 'celular') {
        const i = contatoCelularInfo(assets, c)
        return i ? i.texto : ''
      }
      return c[filters.sortKey] || ''
    }
    return String(val(a)).localeCompare(String(val(b)), 'pt-BR') * filters.sortDir
  })
  return list
}
