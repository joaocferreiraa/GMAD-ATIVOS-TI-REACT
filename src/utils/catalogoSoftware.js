// Catálogo de software do parque: agrupa o que cada máquina tem instalado
// numa visão por PROGRAMA, em vez de por máquina.
//
// POR QUE ISSO É OUTRA PERGUNTA:
// a ficha da máquina responde "o que tem neste PC?". Aqui a pergunta é
// "quantas instalações de X eu tenho, e em quais máquinas?" — que é o que
// se precisa para comprar licença, achar software não autorizado e
// descobrir quem está com versão velha de um programa que já teve falha
// de segurança corrigida.

// Programas que, num parque corporativo, pedem verificação quando
// aparecem. Não é lista de "vírus": é o conjunto do que costuma entrar
// sem passar pelo TI e traz risco jurídico (pirataria), de banda
// (torrent), ou de acesso não controlado (ferramenta remota paralela).
//
// A regra casa por trecho do nome, em minúsculas. Ficar do lado do falso
// positivo é deliberado: é melhor a equipe descartar um item conhecido do
// que um torrent passar despercebido.
const PADROES_ATENCAO = [
  { termo: 'torrent', motivo: 'Compartilhamento P2P — risco de pirataria e consumo de banda' },
  { termo: 'utorrent', motivo: 'Compartilhamento P2P — risco de pirataria e consumo de banda' },
  { termo: 'bittorrent', motivo: 'Compartilhamento P2P — risco de pirataria e consumo de banda' },
  { termo: 'ccleaner', motivo: 'Histórico de comprometimento na cadeia de distribuição' },
  {
    termo: 'driver booster',
    motivo: 'Atualizador de drivers de terceiro — costuma instalar software junto',
  },
  {
    termo: 'driver easy',
    motivo: 'Atualizador de drivers de terceiro — costuma instalar software junto',
  },
  { termo: 'baidu', motivo: 'Software com histórico de coleta de dados' },
  { termo: 'hola vpn', motivo: 'VPN que revende a banda do usuário' },
  { termo: 'weather', motivo: 'Aplicativo de propaganda, geralmente instalado sem intenção' },
  { termo: 'toolbar', motivo: 'Barra de navegador, geralmente instalada sem intenção' },
  { termo: 'nmap', motivo: 'Ferramenta de varredura de rede — esperada só em máquina do TI' },
  { termo: 'wireshark', motivo: 'Captura de tráfego — esperada só em máquina do TI' },
  { termo: 'cain', motivo: 'Ferramenta de recuperação de senha' },
]

// Software pago que costuma ter licença por máquina. Aparecer aqui não é
// problema — é o que se precisa CONTAR para conferir com as licenças
// compradas, que é a auditoria que ninguém faz porque dá trabalho.
const PADROES_LICENCA = [
  { termo: 'microsoft office', rotulo: 'Microsoft Office' },
  { termo: 'office 16', rotulo: 'Microsoft Office' },
  { termo: 'office 365', rotulo: 'Microsoft 365' },
  { termo: 'adobe acrobat', rotulo: 'Adobe Acrobat' },
  { termo: 'adobe photoshop', rotulo: 'Adobe Photoshop' },
  { termo: 'adobe illustrator', rotulo: 'Adobe Illustrator' },
  { termo: 'coreldraw', rotulo: 'CorelDRAW' },
  { termo: 'autocad', rotulo: 'AutoCAD' },
  { termo: 'winrar', rotulo: 'WinRAR' },
  { termo: 'nitro pro', rotulo: 'Nitro Pro' },
  { termo: 'teamviewer', rotulo: 'TeamViewer' },
  { termo: 'anydesk', rotulo: 'AnyDesk' },
]

function classificar(nome, padroes) {
  const n = (nome ?? '').toLowerCase()
  return padroes.find((p) => n.includes(p.termo)) ?? null
}

// Monta o catálogo: uma entrada por programa, com onde está instalado e
// quais versões coexistem no parque.
export function montarCatalogo(inventario) {
  const mapa = new Map()

  for (const maquina of inventario ?? []) {
    for (const sw of maquina.softwares ?? []) {
      const nome = sw?.nome
      if (!nome) continue
      if (!mapa.has(nome)) {
        mapa.set(nome, {
          nome,
          fabricante: sw.fabricante ?? null,
          maquinas: [],
          versoes: new Map(),
        })
      }
      const entrada = mapa.get(nome)
      entrada.maquinas.push({ machineUid: maquina.machineUid, hostname: maquina.hostname })
      if (sw.versao) {
        // Guarda em quais máquinas cada versão está: sem isso, saber que
        // há 4 versões do AnyDesk não diz em quais PCs atuar.
        if (!entrada.versoes.has(sw.versao)) entrada.versoes.set(sw.versao, [])
        entrada.versoes.get(sw.versao).push(maquina.hostname)
      }
    }
  }

  return [...mapa.values()]
    .map((e) => {
      const atencao = classificar(e.nome, PADROES_ATENCAO)
      const licenca = classificar(e.nome, PADROES_LICENCA)
      return {
        ...e,
        instalacoes: e.maquinas.length,
        versoes: [...e.versoes.entries()].map(([versao, hosts]) => ({ versao, hosts })),
        // Mais de uma versão do mesmo programa no parque é o sinal de que
        // alguém ficou para trás numa atualização — e programa
        // desatualizado é a porta de entrada mais comum que existe.
        versaoDivergente: e.versoes.size > 1,
        atencao,
        licenca,
      }
    })
    .sort((a, b) => b.instalacoes - a.instalacoes || a.nome.localeCompare(b.nome, 'pt-BR'))
}

// Resumo para a faixa no topo da tela.
export function resumoCatalogo(catalogo) {
  return {
    programas: catalogo.length,
    comAtencao: catalogo.filter((c) => c.atencao).length,
    licenciados: catalogo.filter((c) => c.licenca).length,
    divergentes: catalogo.filter((c) => c.versaoDivergente).length,
  }
}

// Contagem por produto licenciado — é a lista que se compara com as
// licenças compradas. Programas diferentes do mesmo produto (Office 2016 e
// Office 365, por exemplo) somam no mesmo rótulo.
export function contagemLicencas(catalogo) {
  const mapa = new Map()
  for (const item of catalogo) {
    if (!item.licenca) continue
    const rotulo = item.licenca.rotulo
    if (!mapa.has(rotulo)) mapa.set(rotulo, { rotulo, instalacoes: 0, maquinas: new Set() })
    const e = mapa.get(rotulo)
    e.instalacoes += item.instalacoes
    item.maquinas.forEach((m) => e.maquinas.add(m.hostname))
  }
  return [...mapa.values()]
    .map((e) => ({ rotulo: e.rotulo, instalacoes: e.maquinas.size, maquinas: [...e.maquinas] }))
    .sort((a, b) => b.instalacoes - a.instalacoes)
}

export function filtrarCatalogo(catalogo, { busca = '', filtro = '' } = {}) {
  const q = busca.trim().toLowerCase()
  return (catalogo ?? []).filter((c) => {
    if (filtro === 'atencao' && !c.atencao) return false
    if (filtro === 'licenca' && !c.licenca) return false
    if (filtro === 'divergente' && !c.versaoDivergente) return false
    if (q && !`${c.nome} ${c.fabricante ?? ''}`.toLowerCase().includes(q)) return false
    return true
  })
}
