import { isDesatualizada, diasDesdeColeta } from './inventarioFilter'

// Diagnóstico automático do parque: transforma o inventário bruto numa
// lista priorizada de "o que precisa de atenção agora".
//
// POR QUE ISSO EXISTE (e o que separa de um relatório):
// um inventário lista o que existe; quem lê precisa saber o que fazer com
// aquilo. Um relatório de 60 máquinas com uso de disco em cada uma exige
// que alguém varra a lista e decida. Aqui a regra decide — e o que sobra
// na tela é só o que pede ação, ordenado pelo que dói primeiro.
//
// Toda regra devolve também COMO resolver, porque um alerta sem próximo
// passo vira ruído que se aprende a ignorar.

// Limites de disco. 90% é onde o Windows começa a reclamar e a máquina a
// engasgar (arquivo de paginação, atualizações, temporários); 80% é o aviso
// com folga para agir antes.
const DISCO_CRITICO = 90
const DISCO_ATENCAO = 80

// RAM: abaixo de 8 GB, Windows 11 com navegador e ERP já vive em swap —
// é a queixa de "computador lento" que chega no chamado. 8 GB é o limite
// de quem aguenta hoje mas não aguenta a próxima atualização.
const RAM_INSUFICIENTE_GB = 8

function gb(bytes) {
  return bytes ? Number(bytes) / 1024 ** 3 : null
}

function usoDiscoPct(m) {
  if (!m.discoTotalBytes || m.discoLivreBytes === null || m.discoLivreBytes === undefined)
    return null
  return Math.round((1 - m.discoLivreBytes / m.discoTotalBytes) * 100)
}

// Cada achado: o que é, em qual máquina, quão grave e o que fazer.
// `ordem` decide a prioridade na tela — menor aparece primeiro.
const GRAVIDADE_ORDEM = { critico: 0, atencao: 1, oportunidade: 2 }

export function diagnosticarMaquina(maquina) {
  const achados = []
  const add = (a) =>
    achados.push({ ...a, machineUid: maquina.machineUid, hostname: maquina.hostname })

  // --- Disco cheio --------------------------------------------------------
  // Primeiro da lista de propósito: é o único que trava a máquina de vez
  // (Windows não atualiza, aplicativo não salva) e o mais rápido de
  // resolver.
  const uso = usoDiscoPct(maquina)
  if (uso !== null && uso >= DISCO_CRITICO) {
    add({
      tipo: 'disco_critico',
      gravidade: 'critico',
      titulo: `Disco em ${uso}%`,
      detalhe: 'A máquina pode parar de atualizar o Windows e de salvar arquivos.',
      acao: 'Liberar espaço ou ampliar o armazenamento.',
    })
  } else if (uso !== null && uso >= DISCO_ATENCAO) {
    add({
      tipo: 'disco_atencao',
      gravidade: 'atencao',
      titulo: `Disco em ${uso}%`,
      detalhe: 'Ainda funciona, mas chega no limite em pouco tempo.',
      acao: 'Programar limpeza ou troca do disco.',
    })
  }

  // --- Saúde do disco -----------------------------------------------------
  // O próprio Windows já concluiu que o disco está com problema. É o achado
  // mais grave que existe aqui: significa risco de perder dados.
  const discosRuins = (maquina.discos ?? []).filter((d) => d.saude && d.saude !== 'Healthy')
  if (discosRuins.length) {
    add({
      tipo: 'disco_saude',
      gravidade: 'critico',
      titulo: 'Disco com falha reportada',
      detalhe: discosRuins.map((d) => `${d.modelo ?? 'disco'}: ${d.saude}`).join(' · '),
      acao: 'Fazer backup e substituir o disco com urgência.',
    })
  }

  // --- Memória ------------------------------------------------------------
  const ram = gb(maquina.ramTotalBytes)
  if (ram !== null && ram < RAM_INSUFICIENTE_GB) {
    // Slots livres mudam a recomendação: com slot vago é acrescentar
    // pente (barato); sem slot, é trocar os que estão lá (mais caro) —
    // e essa diferença é exatamente o que o TI precisa saber antes de
    // pedir orçamento.
    const slotsLivres =
      maquina.ramSlotsTotais && maquina.ramSlotsUsados
        ? maquina.ramSlotsTotais - maquina.ramSlotsUsados
        : null
    add({
      tipo: 'ram_insuficiente',
      gravidade: 'atencao',
      titulo: `Apenas ${Math.round(ram)} GB de RAM`,
      detalhe: 'Abaixo do mínimo confortável para Windows atual com navegador e ERP.',
      acao:
        slotsLivres > 0
          ? `Acrescentar um pente (${slotsLivres} slot livre).`
          : 'Substituir os pentes — não há slot livre.',
    })
  }

  // --- HDD ----------------------------------------------------------------
  // Oportunidade, não problema: a máquina funciona. Mas trocar HDD por SSD
  // é a intervenção de melhor custo-benefício que existe num parque, e sem
  // um levantamento automático ninguém lembra de quais máquinas ainda têm.
  const comHdd = (maquina.discos ?? []).filter((d) => (d.tipoMidia ?? '').toUpperCase() === 'HDD')
  if (comHdd.length) {
    add({
      tipo: 'hdd',
      gravidade: 'oportunidade',
      titulo: 'Ainda usa disco mecânico (HDD)',
      detalhe: 'Trocar por SSD é o upgrade de maior impacto percebido pelo usuário.',
      acao: 'Programar substituição por SSD.',
    })
  }

  // --- Não reporta --------------------------------------------------------
  // Máquina sumida é ambígua (desligada, fora do parque, agente quebrado),
  // por isso "atenção" e não "crítico" — mas precisa aparecer, senão o
  // inventário envelhece em silêncio.
  if (isDesatualizada(maquina)) {
    const dias = diasDesdeColeta(maquina.coletadoEm)
    add({
      tipo: 'sem_reportar',
      gravidade: 'atencao',
      titulo: `Sem reportar há ${dias} dias`,
      detalhe: 'Pode estar desligada, fora do parque ou com o agente parado.',
      acao: 'Confirmar se a máquina ainda está em uso.',
    })
  }

  // --- Acesso remoto ------------------------------------------------------
  // Sem RustDesk, todo atendimento nessa máquina vira deslocamento.
  if (!maquina.rustdeskId) {
    add({
      tipo: 'sem_acesso_remoto',
      gravidade: 'oportunidade',
      titulo: 'Sem acesso remoto',
      detalhe: 'Atender essa máquina exige ir até ela.',
      acao: 'Instalar o RustDesk (o instalador do agente já faz isso).',
    })
  }

  return achados
}

// Diagnóstico do parque inteiro, ordenado por gravidade e, dentro dela,
// pelo que é mais urgente dentro do mesmo tipo (disco mais cheio primeiro).
export function diagnosticarParque(inventario) {
  const achados = (inventario ?? []).flatMap(diagnosticarMaquina)

  achados.sort((a, b) => {
    const g = GRAVIDADE_ORDEM[a.gravidade] - GRAVIDADE_ORDEM[b.gravidade]
    if (g !== 0) return g
    return a.hostname.localeCompare(b.hostname, 'pt-BR')
  })

  const porGravidade = {
    critico: achados.filter((a) => a.gravidade === 'critico').length,
    atencao: achados.filter((a) => a.gravidade === 'atencao').length,
    oportunidade: achados.filter((a) => a.gravidade === 'oportunidade').length,
  }

  // Máquinas sem nenhum achado: o número que diz "o resto está bem", e que
  // impede a tela de parecer que o parque inteiro está pegando fogo.
  const comProblema = new Set(achados.map((a) => a.machineUid))
  const saudaveis = (inventario ?? []).filter((m) => !comProblema.has(m.machineUid)).length

  return { achados, porGravidade, saudaveis, total: (inventario ?? []).length }
}

export const GRAVIDADE_ROTULO = {
  critico: 'Crítico',
  atencao: 'Atenção',
  oportunidade: 'Oportunidade',
}

export function gravidadeTone(gravidade) {
  if (gravidade === 'critico') return 'danger'
  if (gravidade === 'atencao') return 'warn'
  return 'muted'
}
