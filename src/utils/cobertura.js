// Números de dinheiro do painel, junto do quanto do parque eles cobrem.
//
// Extraído do useDashboardData (mesmo motivo de attention.js estar fora dele):
// é a conta que chega à diretoria pelo KPI "Valor investido", e cálculo assim
// merece teste próprio em vez de viver dentro de um useMemo de 250 linhas.
//
// `preco` é opcional no cadastro. A soma sempre ignora quem não tem — o que
// não dá pra ignorar é que o resultado então NÃO é o valor do parque, e sim o
// valor dos ativos que têm preço. Daí `comPreco` sair daqui junto: quem
// exibe precisa dos dois para não apresentar um pelo outro.

// Aceita "1397.67" (como vem do formulário) e 1397.67. Preço ausente, vazio
// ou não numérico conta como NÃO cadastrado — diferente de zero, que é um
// preço informado e entra na cobertura somando nada.
//
// Number() e não parseFloat(), de propósito, em dois pontos que importam:
//
//   Number('1.397,67')    -> NaN          (recusa)
//   parseFloat('1.397,67') -> 1.397       (aceita como R$ 1,40, calado)
//
// É o mesmo critério do `nonNegativeMoney` que valida o formulário (ver
// AssetFormModal), então o que o cadastro recusa na entrada esta conta também
// recusa na leitura. parseFloat leria um preço em formato brasileiro como
// pouco mais de um real e o somaria sem reclamar — erro que não aparece na
// tela como erro, só como um total menor do que deveria.
//
// String vazia precisa ser barrada antes: Number('') é 0, não NaN.
function precoDe(asset) {
  const bruto = asset?.preco
  if (bruto === null || bruto === undefined || String(bruto).trim() === '') return null
  const n = Number(bruto)
  return Number.isFinite(n) ? n : null
}

export function resumoFinanceiro(assets = []) {
  const total = assets.length
  const precos = assets.map(precoDe).filter((n) => n !== null)
  const comPreco = precos.length
  const invest = precos.reduce((soma, n) => soma + n, 0)

  return {
    total,
    comPreco,
    invest,
    // Dividido por quem TEM preço, não pelo total: `invest` só soma esses.
    // Dividir pela frota inteira diluía a média por todos os ativos sem preço
    // e devolvia um número sem significado — com 9 de 64 preenchidos, saía
    // sete vezes menor que a média real dos que têm preço.
    //
    // null (e não 0) quando ninguém tem preço: não existe média de conjunto
    // vazio, e 0 seria lido como "os ativos custaram zero". Quem exibe troca
    // por "—".
    medio: comPreco ? invest / comPreco : null,
    // true quando o número não fala pelo parque inteiro — é o gatilho da
    // ressalva no KPI. Fica falso sozinho quando a equipe terminar de
    // preencher, sem ninguém ter que lembrar de tirar o aviso.
    parcial: comPreco < total,
  }
}
