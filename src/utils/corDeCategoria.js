// Cor estável por NOME de categoria, para o mesmo departamento sair da mesma
// cor em qualquer gráfico da tela.
//
// O padrão dos gráficos é colorir por POSIÇÃO (colors[i % n]), e como cada
// bloco ordena os seus próprios departamentos por quantidade, "Financeiro"
// caía em índices diferentes em cada bloco e mudava de cor de um cartão pro
// outro. Quem lê acompanha cor, não posição — duas cores para o mesmo setor
// sugere que são setores diferentes.
//
// Derivada do texto e não de uma lista fixa: departamento é campo livre no
// cadastro (ver "+ Novo departamento..." no formulário de Contatos), então
// qualquer lista que eu escrevesse aqui ficaria desatualizada no dia em que
// alguém criasse um setor novo. Assim o setor novo já nasce com cor própria e
// estável, sem ninguém precisar cadastrá-la.
//
// COLISÃO É ESPERADA: são ~20 departamentos para 9 cores na paleta, então
// dois setores vão dividir cor de qualquer jeito. O que importa é que o
// MESMO setor nunca troque — e é isso que o hash garante.

// Hash polinomial. `| 0` mantém em 32 bits com sinal a cada passo, senão o
// número estoura o inteiro seguro do JS e o hash deixa de ser determinístico
// para textos longos.
//
// O multiplicador 131 não é decorativo — foi medido contra os departamentos
// reais do parque, comparando com as alternativas óbvias:
//
//   multiplicador   cores usadas (13 setores, 9 cores)   pior colisão
//   31 (o clássico)              6 de 9                       3
//   33 com xor (djb2a)           6 de 9                       3
//   FNV-1a                       6 de 9                       5
//   131                          9 de 9                       3
//
// Com 31, "Departamento Pessoal", "Processos e TI" e "Técnico Iluminação"
// caíam na MESMA cor e um terço da paleta ficava sem uso — cor estável, mas
// gráfico ilegível. Ao trocar a paleta ou entrar muito departamento novo,
// vale repetir essa medição.
const MULTIPLICADOR = 131

function hash(texto) {
  let h = 0
  for (let i = 0; i < texto.length; i += 1) {
    h = (h * MULTIPLICADOR + texto.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

export function corDeCategoria(rotulo, cores) {
  if (!cores?.length) return undefined
  const texto = String(rotulo ?? '').trim()
  // Sem rótulo não há o que derivar: cai na primeira cor, que é estável e
  // não desloca as demais.
  if (!texto) return cores[0]
  return cores[hash(texto) % cores.length]
}
