#!/usr/bin/env node
//
// Corrige os IDs de ativo para que cada loja tenha a numeração dela sem os
// IDs se confundirem entre si.
//
// POR QUE ISSO EXISTE: o app trata o ID do ativo como único no sistema
// inteiro — a checagem de duplicata em useAssetMutations.js, o vínculo de
// chamado (assets.find(a => a.id === ticket.asset_id)) e o casamento com o
// inventário do agente (inventarioMatch.js) todos assumem isso. Mas a
// numeração era feita por unidade, cada uma reiniciando em 0001, então o
// mesmo "DSK-0001" acabou em mais de um equipamento. São dois problemas
// diferentes, e o script resolve os dois:
//
//   1. Lojas de FORA da Madville ganham a sigla delas no ID
//      (DSK-0001 -> CWB-DSK-0001). O número é preservado: a loja continua
//      com a numeração própria, só passa a dizer de quem é.
//
//   2. Dentro da Madville (Loja, CD, Soluções) não tem sigla para resolver
//      — as três são a mesma empresa e compartilham uma sequência só —
//      então as duplicatas são renumeradas de verdade.
//
// COMO RODAR (dry-run, não grava nada — é o padrão):
//
//   $env:GMAD_USUARIO = "nome.sobrenome"
//   $env:GMAD_SENHA = "sua-senha"
//   node scripts/corrigir-ids-ativos.js
//
// Conferido o relatório, para gravar de verdade:
//
//   node scripts/corrigir-ids-ativos.js --aplicar
//
// O usuário e a senha são os MESMOS da tela de login do painel (aceita
// "nome.sobrenome" sem @, igual à tela — ver utils/loginEmail.js). A URL e
// a chave anônima vêm do .env.local. O login é necessário porque o
// kv_store é protegido por RLS: a chave anônima sozinha não lê nem grava.
//
// Rodar de novo depois de aplicar é seguro: o plano sai vazio.
//
// Com --aplicar, cada renomeação também vira linha no histórico de alterações
// (tabela historico_alteracoes, ver 0013). Este script grava direto no
// kv_store, sem passar pelas mutações do app, então sem esse registro a maior
// mudança de ID do parque seria a única invisível na tela de Atividade —
// justamente a que alguém vai querer rastrear depois.
//
// Opções:
//   --aplicar          grava as mudanças (sem isso, só mostra o plano)
//   --manter=<texto>   na etapa 2, força a unidade Madville que fica com os
//                      números atuais (ex: --manter="Madville (CD)"). Sem
//                      isso, mantém a unidade com mais ativos na categoria,
//                      que é a que deixa menos etiqueta e hostname para
//                      trocar.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'node:fs'
import { planejar, planejarChamados } from './lib/planoIdsAtivos.js'
import { buildLoginEmail } from '../src/utils/loginEmail.js'
import { nameFromEmail } from '../src/utils/formatters.js'

const DATA_KEY = 'gmad_ativos_data'
const HISTORICO = 'historico_alteracoes'

const MOTIVOS = {
  'sigla-da-loja': 'sigla da loja',
  'duplicata-madville': 'duplicata Madville',
}

const args = process.argv.slice(2)
const aplicar = args.includes('--aplicar')
const manterForcado = args.find((a) => a.startsWith('--manter='))?.slice('--manter='.length)

function abortar(msg) {
  console.error(`\n  ERRO: ${msg}\n`)
  process.exit(1)
}

function carregarEnvLocal() {
  let texto
  try {
    texto = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
  } catch {
    abortar('.env.local não encontrado na raiz do projeto.')
  }
  const env = {}
  for (const linha of texto.split(/\r?\n/)) {
    const i = linha.indexOf('=')
    if (i < 0 || linha.trimStart().startsWith('#')) continue
    env[linha.slice(0, i).trim()] = linha.slice(i + 1).trim()
  }
  return env
}

function coluna(v, n) {
  return String(v ?? '').padEnd(n)
}

function imprimirPlano(plano, ativos) {
  console.log(
    `\n  ${ativos.length} ativos: ${plano.totalMadville} na Madville, ` +
      `${plano.totalOutras} em outras lojas.`,
  )

  if (!plano.renomeacoes.length && !plano.manuais.length) {
    console.log('\n  Nenhum ID a corrigir. Nada a fazer.\n')
    return false
  }

  console.log(`\n  ${plano.renomeacoes.length} ativo(s) a renomear:\n`)
  console.log(
    `  ${coluna('DE', 16)}${coluna('PARA', 18)}${coluna('UNIDADE', 22)}` +
      `${coluna('CATEGORIA', 12)}${coluna('MOTIVO', 20)}ETIQUETA`,
  )
  console.log(`  ${'-'.repeat(100)}`)
  for (const r of plano.renomeacoes) {
    const a = r.ativo
    console.log(
      `  ${coluna(r.de, 16)}${coluna(r.para, 18)}${coluna(a.unidade, 22)}` +
        `${coluna(a.categoria, 12)}${coluna(MOTIVOS[r.motivo] || r.motivo, 20)}` +
        `${a.etiqueta === 'Possui' ? 'REIMPRIMIR' : '—'}`,
    )
  }

  if (plano.manuais.length) {
    console.log(`\n  ${plano.manuais.length} duplicata(s) que o script NÃO renumera (ID fora do`)
    console.log('  padrão PREFIXO-0000 e categoria sem prefixo conhecido) — resolva pela tela:')
    for (const a of plano.manuais) console.log(`    ${a.id}  ${a.unidade}  ${a.categoria}`)
  }

  return true
}

// Etiqueta física e hostname são trabalho fora do sistema — o script não
// mexe em nenhum dos dois, só mostra o que sobra para uma pessoa fazer.
function imprimirPendenciasFisicas(renomeacoes, inventario) {
  const comEtiqueta = renomeacoes.filter((r) => r.ativo.etiqueta === 'Possui')
  if (comEtiqueta.length) {
    console.log(`\n  ETIQUETAS A REIMPRIMIR (${comEtiqueta.length}):`)
    for (const r of comEtiqueta)
      console.log(`    ${r.de} -> ${r.para}   ${r.ativo.unidade}   ${r.ativo.usuario || ''}`)
  }

  const porHostname = new Map()
  for (const m of inventario) porHostname.set(String(m.hostname || '').toUpperCase(), m)
  const aRenomear = renomeacoes
    .map((r) => ({ r, maquina: porHostname.get(String(r.de).toUpperCase()) }))
    .filter((x) => x.maquina)
  if (aRenomear.length) {
    console.log(`\n  HOSTNAMES A RENOMEAR NO WINDOWS/AD (${aRenomear.length}):`)
    console.log('  As máquinas de domínio são nomeadas com o próprio ID do ativo. Enquanto o')
    console.log('  hostname não for trocado elas aparecem como "máquina sem cadastro" no')
    console.log('  Inventário (ver inventarioMatch.js).')
    for (const { r, maquina } of aRenomear)
      console.log(`    ${r.de} -> ${r.para}   (usuário logado: ${maquina.usuario_logado || '—'})`)
  }
}

function imprimirChamados({ atualizar, ambiguos }) {
  if (atualizar.length) {
    console.log(`\n  CHAMADOS A REVINCULAR (${atualizar.length}):`)
    for (const { chamado, para } of atualizar)
      console.log(`    #${chamado.id}  ${chamado.ativo_id} -> ${para}   ${chamado.titulo || ''}`)
  }
  if (ambiguos.length) {
    console.log(`\n  CHAMADOS AMBÍGUOS — corrija à mão (${ambiguos.length}):`)
    console.log('  A unidade do chamado não identifica qual dos ativos duplicados era o certo.')
    for (const c of ambiguos)
      console.log(
        `    #${c.id}  ativo ${c.ativo_id}  unidade "${c.unidade || '—'}"  ${c.titulo || ''}`,
      )
  }
}

// --- Execução -----------------------------------------------------------

const env = carregarEnvLocal()
if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_ANON_KEY)
  abortar('VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY ausentes no .env.local.')
if (!process.env.GMAD_USUARIO || !process.env.GMAD_SENHA)
  abortar(
    'defina GMAD_USUARIO e GMAD_SENHA no ambiente — o MESMO usuário e senha da tela\n' +
      '  de login do painel (o kv_store é protegido por RLS, a chave anônima não basta).\n' +
      '  PowerShell:  $env:GMAD_USUARIO = "nome.sobrenome"; $env:GMAD_SENHA = "..."',
  )

const sb = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
})

// Mesma regra da tela de login: "nome.sobrenome" vira "nome.sobrenome@gmad.ti".
const { error: erroLogin } = await sb.auth.signInWithPassword({
  email: buildLoginEmail(process.env.GMAD_USUARIO),
  password: process.env.GMAD_SENHA,
})
if (erroLogin) abortar(`login falhou: ${erroLogin.message}`)

const { data: linha, error: erroLeitura } = await sb
  .from('kv_store')
  .select('value, updated_at')
  .eq('key', DATA_KEY)
  .single()
if (erroLeitura) abortar(`falha ao ler ${DATA_KEY}: ${erroLeitura.message}`)

const ativos = linha.value
const plano = planejar(ativos, { manterForcado })
if (!imprimirPlano(plano, ativos)) process.exit(0)

const { data: inventario } = await sb.from('host_inventory').select('hostname, usuario_logado')
imprimirPendenciasFisicas(plano.renomeacoes, inventario || [])

const { data: chamados } = await sb
  .from('helpdesk_tickets')
  .select('id, titulo, unidade, ativo_id')
  .not('ativo_id', 'is', null)
const planoChamados = planejarChamados(plano.porIdAntigo, chamados)
imprimirChamados(planoChamados)

if (!aplicar) {
  console.log('\n  DRY-RUN: nada foi gravado. Rode com --aplicar para efetivar.\n')
  process.exit(0)
}

// A partir daqui grava. O backup vem antes de qualquer escrita: o kv_store
// guarda a lista inteira sob uma chave só, então não existe desfazer
// parcial se algo falhar no meio.
const arquivoBackup = `backup-ativos-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
writeFileSync(arquivoBackup, JSON.stringify(ativos, null, 2), 'utf8')
console.log(`\n  Backup da lista original: ${arquivoBackup}`)

const novoPorUid = new Map(plano.renomeacoes.map((r) => [r.ativo.uid, r.para]))
const ativosNovos = ativos.map((a) =>
  novoPorUid.has(a.uid) ? { ...a, id: novoPorUid.get(a.uid) } : a,
)

// Gravação condicional (compare-and-swap), igual ao kvSet do app: se
// alguém salvou pelo painel entre a leitura e agora, aborta em vez de
// sobrescrever o trabalho da pessoa.
const { data: gravado, error: erroGravacao } = await sb
  .from('kv_store')
  .update({ value: ativosNovos, updated_at: new Date().toISOString() })
  .eq('key', DATA_KEY)
  .eq('updated_at', linha.updated_at)
  .select('key')
if (erroGravacao) abortar(`falha ao gravar: ${erroGravacao.message}`)
if (!gravado?.length)
  abortar(
    'alguém alterou os ativos pelo painel enquanto o script rodava — nada foi gravado.\n' +
      '  Rode de novo para recalcular o plano em cima dos dados atuais.',
  )
console.log(`  ${plano.renomeacoes.length} ativo(s) renomeado(s).`)

let chamadosOk = 0
for (const { chamado, para } of planoChamados.atualizar) {
  const { error } = await sb
    .from('helpdesk_tickets')
    .update({ ativo_id: para })
    .eq('id', chamado.id)
  if (error) console.error(`    falha no chamado #${chamado.id}: ${error.message}`)
  else chamadosOk++
}
if (planoChamados.atualizar.length) console.log(`  ${chamadosOk} chamado(s) revinculado(s).`)

// Registra a correção no histórico de alterações (ver
// 0013_historico_alteracoes.sql). Este script grava direto no kv_store, sem
// passar pelas mutações do app — sem isto, a maior mudança de ID em meses
// seria a única invisível na trilha, justamente a que alguém vai querer
// rastrear depois ("por que este ativo mudou de ID?").
//
// Vale a mesma regra do pushLog do app: registrar não pode derrubar o que já
// foi feito. A renomeação acima já está gravada e não se desfaz — se o
// histórico falhar aqui, avisa e segue.
const autor = nameFromEmail(buildLoginEmail(process.env.GMAD_USUARIO))
const linhasHistorico = plano.renomeacoes.map((r) => ({
  autor,
  acao: 'editar',
  entidade: 'ativos',
  entidade_uid: r.ativo.uid,
  rotulo: r.para,
  texto:
    `Corrigiu o ID do ativo ${r.de} para ${r.para} ` +
    `(${MOTIVOS[r.motivo] || r.motivo}, via script corrigir-ids-ativos)`,
  // O ativo com o ID NOVO: é o estado em que ele ficou depois desta correção.
  dados: { ...r.ativo, id: r.para },
}))
const { error: erroHistorico } = await sb.from(HISTORICO).insert(linhasHistorico)
if (erroHistorico)
  console.error(
    `\n  AVISO: os ativos foram renomeados, mas o histórico não registrou: ${erroHistorico.message}` +
      '\n  A correção está feita — só não ficou rastreável na tela de Atividade.',
  )
else console.log(`  ${linhasHistorico.length} registro(s) no histórico de alterações.`)

console.log('\n  Pronto. Falta o trabalho físico listado acima (etiquetas e hostnames).\n')
