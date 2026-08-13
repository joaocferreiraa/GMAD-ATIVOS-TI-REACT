import { getDepartamentos } from './units'
import { getContatoDepartamentos } from './contatosFilter'
import { dedupeCaseInsensitive } from './textFilter'

// Departamento com uma subclassificação própria: além do departamento em si,
// Ativos e Contatos ligados a Vendas também guardam se é um vendedor
// interno, externo ou consumidor final (ver `vendaTipo` em
// AssetFormModal/ContatoFormModal). Campo condicional — só faz sentido
// quando departamento === DEPARTAMENTO_VENDAS.
export const DEPARTAMENTO_VENDAS = 'Vendas'
export const VENDA_TIPOS = ['Interno(a)', 'Externo(a)', 'Consumidor Final']

// Departamentos "extras": nomes criados intencionalmente antes de qualquer
// ativo/colaborador usá-los, pra ficarem disponíveis como opção nos
// formulários assim que alguém for cadastrar algo naquele departamento.
// Um departamento digitado num ativo ou colaborador (via "+ Novo
// departamento...") já aparece sozinho depois — só precisa entrar aqui
// quando alguém quer criar o nome adiantado, sem vínculo ainda.
const EXTRA_DEPARTAMENTOS = [
  'Soluções',
  'Crédito e Cobrança',
  'Departamento Pessoal',
  'Bem Estar',
  'Caixa',
  DEPARTAMENTO_VENDAS,
]

// União dos departamentos em uso em Ativos e Contatos com os extras acima —
// usada pelos dropdowns de formulário (ao cadastrar/editar um ativo ou um
// colaborador), pra um departamento criado num módulo aparecer como opção
// no outro também. Deduplicado ignorando maiúsculas/espaços (ver
// dedupeCaseInsensitive) pra "TI" e "Ti" digitados em telas diferentes não
// virarem duas opções distintas. Os filtros de listagem (Ativos/Contatos)
// continuam usando getDepartamentos/getContatoDepartamentos isolados — lá a
// lista é uma distribuição do que já existe naquela tela, não um catálogo de
// opções, então incluir um departamento sem nenhum registro só geraria um
// filtro que sempre retorna vazio.
export function getDepartamentoOptions(assets, contatos) {
  const values = dedupeCaseInsensitive([
    ...getDepartamentos(assets),
    ...getContatoDepartamentos(contatos),
    ...EXTRA_DEPARTAMENTOS,
  ])
  return values.sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

// Sentinel comum aos campos "Select + Novo ..." (Departamento em Ativos/
// Contatos, Usuário em Ativos): quando selecionado, o valor de verdade vem
// do campo de texto livre companheiro (ex: departamentoNovo) em vez da
// própria opção. Um único valor pros dois campos é seguro porque cada
// select só compara o sentinel contra o próprio watch — nunca um contra o
// outro.
export const NOVO_ITEM = '__novo__'

// Resolve o valor final de um campo "Select + Novo ...": usado tanto pra
// decidir o que exibir/comparar durante a digitação (ex: mostrar "Tipo de
// vendedor" quando o departamento efetivo é Vendas) quanto pra montar o
// registro no onSubmit — mesma resolução nos dois pontos, ver
// AssetFormModal/ContatoFormModal.
export function resolveNovoValue(selected, novoValue) {
  return selected === NOVO_ITEM ? novoValue.trim() : selected.trim()
}
