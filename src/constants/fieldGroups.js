// Campos técnicos específicos de cada categoria de ativo, portados 1:1 de
// FIELD_GROUPS no sistema original. `options` vira um <Select>; sem
// `options` vira um <Input> (type: 'date' quando indicado).
export const FIELD_GROUPS = {
  Desktop: [
    { key: 'ad', label: 'Usuário de rede (AD)' },
    { key: 'modelo', label: 'Fabricante / Modelo' },
    { key: 'processador', label: 'Processador' },
    { key: 'ram', label: 'Memória RAM' },
    { key: 'armazenamento', label: 'Armazenamento' },
    { key: 'so', label: 'Sistema Operacional' },
    { key: 'nf', label: 'Nota fiscal (NF)' },
  ],
  Monitor: [
    { key: 'pcVinculado', label: 'ID do PC vinculado' },
    { key: 'modelo', label: 'Fabricante / Modelo' },
    { key: 'tamanho', label: 'Tamanho (polegadas)' },
    { key: 'resolucao', label: 'Resolução' },
    { key: 'conexoes', label: 'Conexões' },
    { key: 'serial', label: 'Número de série (S/N)' },
    { key: 'fabricacao', label: 'Fabricação', type: 'date' },
    { key: 'nf', label: 'Nota fiscal (NF)' },
  ],
  Celular: [
    { key: 'modelo', label: 'Fabricante / Modelo' },
    { key: 'codModelo', label: 'Código do modelo' },
    { key: 'ram', label: 'Memória RAM' },
    { key: 'armazenamento', label: 'Armazenamento' },
    { key: 'imei1', label: 'IMEI 1' },
    { key: 'imei2', label: 'IMEI 2' },
    { key: 'nf', label: 'Nota fiscal (NF)' },
  ],
  Impressora: [
    { key: 'modelo', label: 'Fabricante / Modelo' },
    { key: 'tipoImpressao', label: 'Tipo', options: ['Laser', 'Jato de tinta', 'Térmica'] },
    {
      key: 'finalidade',
      label: 'Finalidade',
      options: ['Documentos', 'Etiqueta', 'Cupom Fiscal'],
    },
    { key: 'conexao', label: 'Conexão', options: ['USB', 'Rede', 'Wi-Fi'] },
    { key: 'ip', label: 'IP (se em rede)' },
    { key: 'suprimento', label: 'Suprimento', options: ['Toner', 'Cartucho', 'Cartucho colorido'] },
    { key: 'serial', label: 'Número de série (S/N)' },
    { key: 'nf', label: 'Nota fiscal (NF)' },
  ],
  Televisão: [
    { key: 'marca', label: 'Marca' },
    { key: 'modelo', label: 'Modelo' },
    { key: 'anoFabricacao', label: 'Ano de fabricação' },
    { key: 'tamanho', label: 'Tamanho (polegadas)' },
    { key: 'resolucao', label: 'Resolução' },
    { key: 'conexoes', label: 'Conexões (HDMI, DisplayPort...)' },
    { key: 'localUso', label: 'Local de uso (ex: Recepção, Sala de reuniões, Showroom)' },
    { key: 'serial', label: 'Número de série (S/N)' },
    { key: 'nf', label: 'Nota fiscal (NF)' },
  ],
}
FIELD_GROUPS.Notebook = FIELD_GROUPS.Desktop

export const ID_PREFIX = {
  Desktop: 'DSK',
  Notebook: 'NTB',
  Monitor: 'MON',
  Celular: 'CEL',
  Impressora: 'IMP',
  Televisão: 'TV',
}
