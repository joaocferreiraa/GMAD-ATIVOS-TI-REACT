// Mapeia o status de um ativo para a variante visual do componente Badge
// (equivalente ao statusBadgeClass do sistema original: ativo/manutencao/inativo).
export function assetStatusVariant(status) {
  if (status === 'Manutenção') return 'warn'
  if (status === 'Inativo') return 'danger'
  return 'ok'
}

// Mapeia o `cls` de warrantyInfo() ('ok'|'warn'|'expired'|'none') para a
// variante visual do Badge.
export function warrantyVariant(cls) {
  if (cls === 'expired') return 'danger'
  if (cls === 'none') return 'muted'
  return cls
}

// Mapeia o status de um item de estoque para a variante visual do Badge
// (equivalente ao stockStatusBadgeClass do sistema original).
export function stockStatusVariant(status) {
  if (status === 'Baixo estoque') return 'warn'
  if (status === 'Em falta') return 'danger'
  return 'ok'
}
