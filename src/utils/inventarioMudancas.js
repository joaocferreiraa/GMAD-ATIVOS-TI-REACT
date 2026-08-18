import { fmtBytes } from './hostFormatters'

// Traduz uma mudança bruta do banco (campo/valor_anterior/valor_novo) para
// a frase que aparece na tela. Fica aqui, e não no componente, porque a
// mesma mudança é exibida em dois lugares: a lista do parque e o histórico
// dentro da ficha de uma máquina.

// Campos cujo valor é uma contagem de bytes: o banco guarda o número cru
// (é o que permite comparar direção no SQL), a tela mostra "16 GiB".
const CAMPOS_BYTES = new Set(['ramTotalBytes', 'discoTotalBytes'])

const ROTULO_CAMPO = {
  ramTotalBytes: 'Memória RAM',
  discoTotalBytes: 'Armazenamento',
  cpuModelo: 'Processador',
  modelo: 'Modelo do equipamento',
  numeroSerie: 'Número de série',
  hostname: 'Nome na rede',
  usuarioLogado: 'Usuário logado',
  dominio: 'Domínio',
  soNome: 'Sistema operacional',
  soBuild: 'Build do Windows',
  software: 'Programa',
}

function valorLegivel(campo, valor) {
  if (valor === null || valor === undefined || valor === '') return null
  if (CAMPOS_BYTES.has(campo)) return fmtBytes(Number(valor))
  // Usuário e domínio vêm como DOMINIO\usuario; a barra invertida some no
  // caminho até a tela em alguns pontos, então normalizamos aqui.
  return String(valor)
}

// Frase única descrevendo a mudança, no tempo passado e com sujeito
// implícito (a máquina): "Memória RAM caiu de 16 GiB para 8 GiB".
//
// Software é caso à parte: o campo é sempre 'software' e o que distingue
// instalação de remoção é qual dos dois valores está vazio.
export function descreverMudanca(mudanca) {
  const { campo, valorAnterior, valorNovo } = mudanca
  const antes = valorLegivel(campo, valorAnterior)
  const depois = valorLegivel(campo, valorNovo)

  if (campo === 'software') {
    if (!antes) return `Programa instalado: ${depois}`
    if (!depois) return `Programa removido: ${antes}`
    return `Programa alterado: ${antes} → ${depois}`
  }

  const rotulo = ROTULO_CAMPO[campo] ?? campo

  if (CAMPOS_BYTES.has(campo) && antes && depois) {
    const diminuiu = Number(valorNovo) < Number(valorAnterior)
    return `${rotulo} ${diminuiu ? 'caiu' : 'aumentou'} de ${antes} para ${depois}`
  }

  if (!antes) return `${rotulo} definido como ${depois}`
  if (!depois) return `${rotulo} removido (era ${antes})`
  return `${rotulo}: ${antes} → ${depois}`
}

// Variante do Badge por severidade — mesmas 4 do componente (ver Badge.jsx).
export function severidadeTone(severidade) {
  if (severidade === 'alerta') return 'danger'
  if (severidade === 'atencao') return 'warn'
  return 'muted'
}

export const ROTULO_TIPO = {
  hardware: 'Hardware',
  software: 'Software',
  sistema: 'Sistema',
  identidade: 'Identidade',
}

// Filtro da lista de mudanças. Função pura, mesmo padrão dos outros
// filtros do projeto.
export function filtrarMudancas(lista, { tipo = '', severidade = '', busca = '' } = {}) {
  const q = busca.trim().toLowerCase()
  return (lista ?? []).filter((m) => {
    if (tipo && m.tipo !== tipo) return false
    if (severidade && m.severidade !== severidade) return false
    if (q) {
      const texto = [m.hostname, descreverMudanca(m)].join(' ').toLowerCase()
      if (!texto.includes(q)) return false
    }
    return true
  })
}
