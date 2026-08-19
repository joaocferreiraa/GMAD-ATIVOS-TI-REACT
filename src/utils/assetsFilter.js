import { matchesUnitValue } from './units'
import { assetWarrantyInfo } from './formatters'
import { createSearchMatcher, dedupeCaseInsensitive } from './textFilter'

// Lista de ativos filtrada e ordenada pela barra de filtros da tela de
// Ativos (equivalente a filteredAssets() no sistema original). `filters`:
// { unidade, categoria, status, dept, etiqueta, garantia, usuario, search,
//   sortKey, sortDir }.
export function filterAssets(assets, filters) {
  let list =
    filters.unidade === 'Todas'
      ? assets
      : assets.filter((a) => matchesUnitValue(a.unidade, filters.unidade))

  if (filters.categoria !== 'Todos') list = list.filter((a) => a.categoria === filters.categoria)
  if (filters.status) list = list.filter((a) => (a.status || 'Ativo') === filters.status)
  if (filters.dept) list = list.filter((a) => a.departamento === filters.dept)
  if (filters.etiqueta) {
    list = list.filter((a) =>
      filters.etiqueta === 'Possui' ? a.etiqueta === 'Possui' : a.etiqueta !== 'Possui',
    )
  }
  if (filters.garantia) list = list.filter((a) => assetWarrantyInfo(a).cls === filters.garantia)
  if (filters.usuario) list = list.filter((a) => a.usuario === filters.usuario)
  if (filters.search) {
    const matches = createSearchMatcher(filters.search)
    list = list.filter((a) =>
      matches([
        a.id,
        a.usuario,
        a.modelo,
        a.ad,
        a.serial,
        a.imei1,
        a.imei2,
        a.departamento,
        a.vendaTipo,
        a.almoxarifadoArea,
        a.pcVinculado,
        a.codModelo,
      ]),
    )
  }

  list = list.slice()
  if (filters.sortKey) {
    list.sort((a, b) => {
      let va = a[filters.sortKey] || ''
      let vb = b[filters.sortKey] || ''
      if (filters.sortKey === 'preco') {
        va = parseFloat(va) || 0
        vb = parseFloat(vb) || 0
        return (va - vb) * filters.sortDir
      }
      return String(va).localeCompare(String(vb), 'pt-BR') * filters.sortDir
    })
  } else {
    list.sort(
      (a, b) =>
        a.categoria.localeCompare(b.categoria) ||
        String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true }),
    )
  }
  return list
}

export function getUsuarios(scoped) {
  const set = new Set(scoped.map((a) => a.usuario).filter(Boolean))
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Opções pro campo "Usuário" do formulário de ativo (dropdown com "+ Novo
// usuário...", mesmo padrão do campo Departamento): nomes já usados em
// Ativos, mais os colaboradores cadastrados em Contatos.
export function getResponsavelOptions(assets, contatos) {
  const values = dedupeCaseInsensitive([
    ...assets.map((a) => a.usuario),
    ...contatos.map((c) => c.nome),
  ])
  return values.sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
