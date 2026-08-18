import { createSearchMatcher } from './textFilter'

// Uma máquina que não reporta há muito tempo provavelmente está desligada,
// fora do parque ou com o agente quebrado — os três casos pedem atenção do
// TI. O limite é em DIAS (não horas) porque a coleta é diária: máquina de
// alguém de férias na semana passada não deve aparecer como problema.
const DIAS_PARA_DESATUALIZADO = 7

export function diasDesdeColeta(coletadoEm, agora = Date.now()) {
  if (!coletadoEm) return null
  const ms = agora - new Date(coletadoEm).getTime()
  if (Number.isNaN(ms)) return null
  return Math.floor(ms / 86400000)
}

export function isDesatualizada(machine, agora = Date.now()) {
  const dias = diasDesdeColeta(machine?.coletadoEm, agora)
  return dias !== null && dias >= DIAS_PARA_DESATUALIZADO
}

// Filtragem da tela de inventário. Mesma forma dos outros filtros do
// projeto (ver stockFilter.js/assetsFilter.js): função pura, busca por
// texto via createSearchMatcher.
export function filterInventario(list, filters = {}) {
  const {
    search = '',
    tipoChassi = '',
    fabricante = '',
    so = '',
    situacao = '',
    acessoRemoto = '',
  } = filters
  const agora = Date.now()
  const matchSearch = search ? createSearchMatcher(search) : null

  return (list ?? []).filter((m) => {
    if (tipoChassi && m.tipoChassi !== tipoChassi) return false
    if (fabricante && m.fabricante !== fabricante) return false
    // Comparação por prefixo: `soNome` vem cheio de variação da mesma
    // família ("Windows 11 Pro", "Windows 11 Home"), e quem filtra quer a
    // família, não a edição exata.
    if (so && !(m.soNome || '').startsWith(so)) return false

    if (situacao === 'desatualizada' && !isDesatualizada(m, agora)) return false
    if (situacao === 'atual' && isDesatualizada(m, agora)) return false

    // Filtro de acesso remoto: 'pronto' são as máquinas conectáveis;
    // 'pendente' junta tudo que impede conectar (sem RustDesk, sem ID, ou
    // ainda não verificado) — é a lista de trabalho de quem vai instalar.
    if (acessoRemoto === 'pronto' && !m.rustdeskId) return false
    if (acessoRemoto === 'pendente' && m.rustdeskId) return false

    if (matchSearch) {
      // Inclui usuário e IPs: "de quem é a máquina X?" e "que máquina é o
      // IP Y?" são as duas perguntas mais frequentes num inventário.
      const ips = (m.adaptadoresRede ?? []).flatMap((a) => a.ips ?? [])
      if (
        !matchSearch([
          m.hostname,
          m.usuarioLogado,
          m.fabricante,
          m.modelo,
          m.numeroSerie,
          m.cpuModelo,
          m.soNome,
          // ID do RustDesk: quem liga pedindo suporte informa o número que
          // aparece na tela dele — buscar por ele acha a máquina.
          m.rustdeskId,
          ...ips,
        ])
      )
        return false
    }

    return true
  })
}

// Família do SO pro filtro (agrupa edições: Pro/Home/Enterprise viram
// "Windows 11"). Sem isso o select teria uma entrada por edição instalada.
export function familiaSo(soNome) {
  if (!soNome) return null
  const m = soNome.match(/Windows\s+(?:Server\s+)?[\d.]+/i)
  return m ? m[0].replace(/\s+/g, ' ') : soNome
}
