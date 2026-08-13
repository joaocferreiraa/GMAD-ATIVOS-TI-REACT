// Factory de chaves do TanStack Query, uma por domínio (todos persistidos via kv_store no Supabase,
// exceto monitoramentoMedicoes/monitoramentoAlertas — tabelas relacionais, ver measurementsService.js).
export const queryKeys = {
  ativos: ['ativos'],
  estoque: ['estoque'],
  instaladores: ['instaladores'],
  scripts: ['scripts'],
  infraestrutura: ['infraestrutura'],
  contatos: ['contatos'],
  atividade: ['atividade'],
  monitores: ['monitores'],
  // Chaves-base: hooks parametrizados (por ponto/período) concatenam mais
  // itens ao array, ex: [...queryKeys.medicoes, monitorUid, periodo].
  medicoes: ['monitoramento', 'medicoes'],
  alertas: ['monitoramento', 'alertas'],
}
