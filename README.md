# Controle de Ativos de TI — GMAD Madville

Painel interno de controle de ativos de TI (React + Vite + Supabase + TanStack Query). Cadastro de ativos, contatos, estoque, instaladores, scripts, infraestrutura, relatórios e atividade recente.

## Como rodar

```bash
npm install
cp .env.example .env.local   # preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY
npm run dev
```

Usuários autorizados são criados no painel do Supabase, em Authentication → Users. O login aceita apenas `nome.sobrenome` (sem `@`) e completa com o domínio definido em `LOGIN_DOMAIN` (`src/services/supabase/authService.js`), hoje `@gmad.ti` — cadastre os usuários no Supabase com esse mesmo domínio.

## Deploy

O projeto usa `createBrowserRouter`, então o servidor precisa devolver `index.html` em qualquer rota (senão acessar `/ativos` direto pela URL dá 404). O `vercel.json` na raiz já faz esse rewrite. Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nas variáveis de ambiente do projeto na Vercel.

## Scripts

- `npm run dev` — servidor de desenvolvimento
- `npm run build` — build de produção em `dist/`
- `npm run preview` — serve o build de produção localmente
- `npm run lint` — ESLint
- `npm run format` / `npm run format:check` — Prettier

## Stack

React 19, React Router, TanStack Query, React Hook Form + Zod, Supabase (auth + Postgres via kv_store), CSS Modules.

## Adicionando páginas e funcionalidades

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para o padrão a seguir ao criar um módulo, componente, modal, tabela, filtro ou integração novos.
