// Cálculo do plano de correção dos IDs de ativo. Puro (recebe a lista,
// devolve o plano) e separado do script que fala com o Supabase justamente
// para poder ser conferido com dados de mentira antes de rodar em cima dos
// dados de verdade.
//
// Ver scripts/corrigir-ids-ativos.js para o contexto.

import { ID_PREFIX } from '../../src/constants/fieldGroups.js'
import { isMadvilleUnit, unitIdPrefix } from '../../src/utils/units.js'

// Desempate quando duas unidades Madville têm a mesma quantidade de ativos
// na categoria — mesma ordem que as abas da tela de Ativos usam.
const ORDEM_MADVILLE = ['Madville (Loja)', 'Madville (CD)', 'Madville (Soluções)']
const SEQUENCIAL = /^(.*)-(\d+)$/

export function planejar(ativos, { manterForcado } = {}) {
  // ID atual de cada ativo ao longo do plano: as duas etapas abaixo mexem
  // na mesma lista, e a segunda precisa enxergar o que a primeira decidiu.
  const idAtual = new Map(ativos.map((a) => [a.uid, String(a.id || '')]))
  const idsEmUso = new Set([...idAtual.values()].map((id) => id.toUpperCase()).filter(Boolean))
  const renomeacoes = []

  function reservar(candidato) {
    // Se o ID pretendido já existe, cai para o próximo número livre do
    // mesmo prefixo em vez de gerar outra duplicata.
    if (!idsEmUso.has(candidato.toUpperCase())) {
      idsEmUso.add(candidato.toUpperCase())
      return candidato
    }
    const m = SEQUENCIAL.exec(candidato)
    if (!m) return null
    let n = parseInt(m[2], 10)
    let proximo
    do {
      n++
      proximo = `${m[1]}-${String(n).padStart(4, '0')}`
    } while (idsEmUso.has(proximo.toUpperCase()))
    idsEmUso.add(proximo.toUpperCase())
    return proximo
  }

  function aplicar(ativo, para, motivo) {
    const de = idAtual.get(ativo.uid)
    idsEmUso.delete(de.toUpperCase())
    idAtual.set(ativo.uid, para)
    renomeacoes.push({ ativo, de, para, motivo })
  }

  // --- Etapa 1: sigla da loja nos IDs de fora da Madville ---------------
  //
  // O número é preservado (DSK-0001 -> CWB-DSK-0001): a loja continua com a
  // numeração dela, só passa a dizer de quem é. É isso que deixa as duas
  // sequências conviverem sem se confundir.
  for (const a of ativos) {
    const sigla = unitIdPrefix(a.unidade)
    const id = idAtual.get(a.uid)
    if (!sigla || !id) continue
    if (id.toUpperCase().startsWith(`${sigla.toUpperCase()}-`)) continue
    const para = reservar(`${sigla}-${id}`)
    if (para) aplicar(a, para, 'sigla-da-loja')
  }

  // --- Etapa 2: duplicatas entre as unidades Madville -------------------
  //
  // As três compartilham uma sequência só, então aqui não tem sigla para
  // resolver: um dos registros precisa mesmo mudar de número.
  const madville = ativos.filter((a) => isMadvilleUnit(a.unidade))

  // Quantos ativos cada unidade tem por categoria — base do critério de
  // quem mantém os números.
  const porUnidadeCategoria = new Map()
  for (const a of madville) {
    const chave = `${a.unidade} ${a.categoria}`
    porUnidadeCategoria.set(chave, (porUnidadeCategoria.get(chave) || 0) + 1)
  }
  const peso = (a) => porUnidadeCategoria.get(`${a.unidade} ${a.categoria}`) || 0

  const grupos = new Map()
  for (const a of madville) {
    const chave = idAtual.get(a.uid).toUpperCase()
    if (!chave) continue
    if (!grupos.has(chave)) grupos.set(chave, [])
    grupos.get(chave).push(a)
  }

  const manuais = []
  const colididos = [...grupos.entries()]
    .filter(([, lista]) => lista.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR', { numeric: true }))

  for (const [, lista] of colididos) {
    // Quem mantém: a unidade com mais ativos na categoria (menos etiqueta e
    // hostname para trocar na prática); empate desempata pela ordem das
    // abas, e `manterForcado` sobrepõe os dois.
    const ordenados = [...lista].sort((x, y) => {
      if (manterForcado) {
        const fx = x.unidade === manterForcado ? 0 : 1
        const fy = y.unidade === manterForcado ? 0 : 1
        if (fx !== fy) return fx - fy
      }
      if (peso(y) !== peso(x)) return peso(y) - peso(x)
      const ox = ORDEM_MADVILLE.indexOf(x.unidade)
      const oy = ORDEM_MADVILLE.indexOf(y.unidade)
      if (ox !== oy) return (ox < 0 ? 99 : ox) - (oy < 0 ? 99 : oy)
      // Último desempate pelo uid só para o plano sair igual em duas
      // execuções seguidas — sem isso a ordem dependeria da ordem da lista.
      return String(x.uid).localeCompare(String(y.uid))
    })

    for (const perdedor of ordenados.slice(1)) {
      // O prefixo sai da categoria; se a categoria não tiver prefixo
      // conhecido, cai pro prefixo do próprio ID atual. Sem nenhum dos dois
      // (ID escrito à mão numa categoria fora da tabela), o script não
      // inventa nome: reporta para a pessoa decidir.
      const id = idAtual.get(perdedor.uid)
      const prefixo = ID_PREFIX[perdedor.categoria] || SEQUENCIAL.exec(id)?.[1]
      if (!prefixo) {
        manuais.push(perdedor)
        continue
      }
      // Começa do maior número já usado nesse prefixo; reservar() empurra
      // para o próximo livre.
      const maior = Math.max(
        0,
        ...[...idsEmUso]
          .map((usado) => new RegExp(`^${prefixo.toUpperCase()}-(\\d+)$`).exec(usado)?.[1])
          .filter(Boolean)
          .map(Number),
      )
      const para = reservar(`${prefixo}-${String(maior + 1).padStart(4, '0')}`)
      if (para) aplicar(perdedor, para, 'duplicata-madville')
      else manuais.push(perdedor)
    }
  }

  // Para religar os chamados depois: quem usava cada ID antigo, e para onde
  // cada um foi (null = ficou onde estava).
  const novoPorUid = new Map(renomeacoes.map((r) => [r.ativo.uid, r.para]))
  const porIdAntigo = new Map()
  for (const a of ativos) {
    const chave = String(a.id || '').toUpperCase()
    if (!chave) continue
    if (!porIdAntigo.has(chave)) porIdAntigo.set(chave, [])
    porIdAntigo.get(chave).push({ ativo: a, para: novoPorUid.get(a.uid) ?? null })
  }

  return {
    renomeacoes,
    manuais,
    porIdAntigo,
    totalMadville: madville.length,
    totalOutras: ativos.length - madville.length,
  }
}

// Chamados afetados. O "Equipamento relacionado" guarda o ID como texto
// solto (ver migração 0003), e o ID antigo podia pertencer a mais de um
// ativo — mas o chamado também guarda a unidade, e é ela que desfaz a
// ambiguidade:
//
//   um único ativo usava aquele ID  -> segue o ativo
//   vários, e a unidade aponta um   -> segue esse
//   vários, e a unidade não decide  -> ninguém decide por você; vira lista
export function planejarChamados(porIdAntigo, chamados) {
  const atualizar = []
  const ambiguos = []

  for (const c of chamados || []) {
    if (!c.ativo_id) continue
    const entradas = porIdAntigo.get(String(c.ativo_id).toUpperCase())
    if (!entradas || !entradas.some((e) => e.para)) continue

    const candidatos =
      entradas.length === 1
        ? entradas
        : entradas.filter((e) => c.unidade && e.ativo.unidade === c.unidade)

    if (candidatos.length !== 1) {
      ambiguos.push(c)
      continue
    }
    // O ativo certo pode ser justamente o que NÃO mudou de ID — nesse caso
    // o chamado já aponta para o lugar certo e não precisa de nada.
    if (candidatos[0].para) atualizar.push({ chamado: c, para: candidatos[0].para })
  }

  return { atualizar, ambiguos }
}
