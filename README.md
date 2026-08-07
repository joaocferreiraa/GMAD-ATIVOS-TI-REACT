# Controle de Ativos de TI — GMAD Madville

Painel interno de controle de ativos de TI (React + Vite + Supabase + TanStack Query). Cadastro de ativos, contatos, estoque, instaladores, scripts, infraestrutura, relatórios e atividade recente.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Usuários autorizados são criados no painel do Supabase, em Authentication → Users.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção em `dist/`
- `npm run preview` — serve o build de produção localmente
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier

## Stack

React 19, React Router, TanStack Query, React Hook Form + Zod, Supabase (auth + Postgres via kv_store), CSS Modules.
