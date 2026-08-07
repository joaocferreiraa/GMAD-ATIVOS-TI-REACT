import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Rotas pós-login e as libs de exportação (xlsx/jspdf) já são
    // carregadas sob demanda (React.lazy / import() dinâmico) — o chunk
    // principal (React + Router + Query + Supabase + o shell do app) fica
    // em ~620kB, acima do limite padrão de 500kB só por causa das
    // dependências em si, não por falta de code-splitting.
    chunkSizeWarningLimit: 700,
  },
})
