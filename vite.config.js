import { execFileSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

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
})
