import { execFileSync } from 'node:child_process'
import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'

// Silencia só o aviso "A PostCSS plugin did not pass the `from` option to
// postcss.parse" — é interno do próprio pipeline de CSS do Vite (processa
// os .module.css do projeto), não vem de nenhum plugin/config nosso (não há
// postcss.config.js aqui) e não indica erro real; só polui o terminal a
// cada `npm run dev`. Esse aviso específico sai via logger.warnOnce (plugin
// interno UrlRewritePostcssPlugin do próprio Vite, dist/node/chunks/node.js)
// — não via logger.warn — então as duas precisam ser filtradas, senão só
// filtrar `warn` deixa esse passar. Qualquer outro aviso continua normal.
const logger = createLogger()
function filtered(original) {
  return (msg, options) => {
    if (msg.includes('did not pass the `from` option to `postcss.parse`')) return
    original(msg, options)
  }
}
logger.warn = filtered(logger.warn)
logger.warnOnce = filtered(logger.warnOnce)

// Número de versão e data do commit atual, embutidos no bundle em build time
// (Vercel clona o repo antes de buildar, então isso reflete o último push a
// cada deploy). O número é a contagem de commits (git rev-list --count) —
// sobe 1 a cada commit, sem precisar mexer em nenhum arquivo de versão à
// mão. execFileSync (sem shell) evita que o `|` do --format seja
// interpretado como pipe pelo cmd.exe no Windows. Sem repo git disponível
// (ex.: build fora de um checkout), cai para um placeholder em vez de
// quebrar o build.
function getBuildInfo() {
  try {
    const date = execFileSync('git', ['log', '-1', '--format=%cI']).toString().trim()
    const number = execFileSync('git', ['rev-list', '--count', 'HEAD']).toString().trim()
    return { number, date }
  } catch {
    return { number: '0', date: new Date().toISOString() }
  }
}

const buildInfo = getBuildInfo()

// https://vite.dev/config/
export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  define: {
    'import.meta.env.VITE_BUILD_NUMBER': JSON.stringify(buildInfo.number),
    'import.meta.env.VITE_BUILD_DATE': JSON.stringify(buildInfo.date),
  },
  build: {
    // Rotas pós-login e as libs de exportação (xlsx/jspdf) já são
    // carregadas sob demanda (React.lazy / import() dinâmico) — o chunk
    // principal (React + Router + Query + Supabase + o shell do app) fica
    // em ~620kB, acima do limite padrão de 500kB só por causa das
    // dependências em si, não por falta de code-splitting.
    chunkSizeWarningLimit: 700,
  },
  // Vitest mora aqui, e não num vitest.config.js à parte, pra herdar de
  // graça o `define` acima — sem ele, qualquer módulo que leia
  // import.meta.env.VITE_BUILD_* quebraria só nos testes.
  //
  // `environment: 'node'` de propósito: o que está coberto hoje é lógica
  // pura e serviços com o Supabase dublado, nada que toque no DOM. Um jsdom
  // aqui custaria segundos por rodada sem cobrir uma linha a mais. No dia em
  // que entrar teste de componente, o caminho é `environment: 'jsdom'` (mais
  // jsdom e @testing-library/react nas devDependencies), não um segundo
  // arquivo de config.
  test: {
    environment: 'node',
    include: ['src/**/*.test.js'],
    // O relógio falso do warrantyInfo (ver formatters.test.js) e os dublês de
    // módulo não devem vazar de um arquivo pro outro.
    restoreMocks: true,
    unstubEnvs: true,
  },
})
