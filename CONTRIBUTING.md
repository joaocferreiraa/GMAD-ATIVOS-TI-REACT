# Padrões de implementação

Guia rápido de como este projeto é organizado e como estender sem duplicar código. Antes de criar algo novo, procure um exemplo equivalente já existente e siga o mesmo padrão — **não crie uma segunda forma de fazer a mesma coisa**.

Módulo de referência (o mais simples, cobre o fluxo CRUD inteiro): **Estoque**
(`src/pages/EstoquePage/`, `src/components/estoque/`, `src/hooks/data/useStock*.js`, `src/services/estoque/stockService.js`, `src/utils/stockFilter.js`).

## Estrutura de pastas

```
src/
  pages/<Modulo>Page/       PageName.jsx + index.jsx (export { default } from ...) + .module.css + use<Modulo>Data.js (se houver agregação)
  components/<modulo>/      componentes específicos do domínio (Filters, Table, FormModal, ViewModal/Drawer, columns.jsx)
  components/ui/            componentes genéricos reutilizáveis por qualquer módulo — olhe aqui ANTES de criar um componente novo
  hooks/data/                hooks de leitura/escrita do TanStack Query (um par useX.js / useXMutations.js por domínio)
  hooks/                     hooks de UI reaproveitáveis entre módulos (useCrudPanelState, useToast...); hooks/overlay/ e hooks/auth|layout|theme/ são subpastas por assunto
  contexts/                  só para estado verdadeiramente global (Auth, Theme, Sidebar, Toast) — nunca para estado de um módulo
  services/<modulo>/         acesso a dados (kv_store) do domínio; services/supabase/ centraliza o client e o kvStore genérico
  utils/                     funções puras (filtros, formatação, validação) — sem side-effect, sem chamar Supabase
  constants/                 listas fixas (categorias, status, opções de select, queryKeys, routes)
```

## Receita: adicionar um módulo CRUD novo (ex.: "Fornecedores")

Siga o Estoque como modelo, nesta ordem:

1. **`src/constants/queryKeys.js`** — adicione `fornecedores: ['fornecedores']`.
2. **`src/services/fornecedores/fornecedoresService.js`** — `getFornecedores()`/`saveFornecedores(list)`, só chamando `kvGet`/`kvSet` de `services/supabase/kvStore.js` com uma `DATA_KEY` própria. Nunca chame `supabase` diretamente fora de `services/supabase/*` (exceção única e já justificada: `AuthProvider.jsx`).
3. **`src/hooks/data/useFornecedores.js`** — uma linha: `export const useFornecedores = createQueryHook(queryKeys.fornecedores, getFornecedores)`.
4. **`src/hooks/data/useFornecedorMutations.js`** — configure `createCrudMutations({ queryKey, saveFn, uidParam, withAudit, createLogMessage, updateLogMessage, deleteLogMessage, createSuccessMessage, updateSuccessMessage, deleteSuccessMessage })` (veja `useStockMutations.js`). Só implemente mutações à mão se o domínio tiver uma mutação que não é create/update/delete (ex.: `toggleFavorite` de Scripts, via `useExtraMutations`) ou não for uma lista plana como o Wi-Fi de Infraestrutura (`useInfraMutations.js`, exceção documentada no próprio arquivo).
5. **`src/utils/fornecedoresFilter.js`** — função `filterFornecedores(list, filters)`; reaproveite `createSearchMatcher` de `utils/textFilter.js` para o campo de busca por texto.
6. **`src/components/fornecedores/`**:
   - `FornecedorFilters/` — `Toolbar` + `SearchInput` + `Select` (`context="toolbar"`) + botão "Limpar filtros" (veja `StockFilters.jsx`).
   - `FornecedorTable/columns.jsx` (`COLUMNS`) + `FornecedorTable/FornecedorTable.jsx` (`Table` + `COLUMNS` + coluna de ações via `RowActions`).
   - `FornecedorFormModal/` — `Modal` (ou `Drawer` se for ficha lateral) + `FormGrid`/`FormField` + `react-hook-form`; validação manual com `showToast(..., 'danger')` (padrão do projeto — não usar `zodResolver` aqui, só o Login usa).
   - `FornecedorViewModal/` (ou reaproveite `ViewRow` de `components/ui/ViewRow` se a ficha for uma lista simples de linhas label/valor).
7. **`src/pages/FornecedoresPage/useFornecedoresData.js`** (se precisar de abas/agregação) — `useMemo` puro, sem `useState`.
8. **`src/pages/FornecedoresPage/FornecedoresPage.jsx`** — monte com `useCrudPanelState({ list, uidParam, mutations })`; a página só orquestra, sem lógica de negócio (copie a estrutura de `EstoquePage.jsx` praticamente na íntegra, trocando os nomes).
9. **`src/pages/FornecedoresPage/index.jsx`** — `export { default } from './FornecedoresPage'`.
10. **`src/constants/routes.js`** — adicione `fornecedores: '/fornecedores'`.
11. **`src/router/routes.jsx`** — adicione `const FornecedoresPage = lazy(() => import('../pages/FornecedoresPage'))` e a rota via `lazyPage(FornecedoresPage)` dentro do grupo protegido.
12. **`src/layouts/AppLayout/Sidebar/navItems.js`** — adicione o item de menu (ícone: reaproveite um de `components/ui/Icon/icons.jsx` ou adicione um novo lá, nunca inline).

## Componentes de UI

Antes de criar um componente, veja se já existe em `src/components/ui/`: `Button`, `Input`, `Select`, `Badge`, `Card`, `Table`, `Tabs`, `Toolbar`, `SearchInput`, `FormField`/`FormGrid`, `Modal`, `Drawer`, `ConfirmDialog`, `ViewRow`, `EmptyState`, `Loading`, `Alert`, `TagChip`, `CodeBlock`. Um componente só vira "de domínio" (`components/<modulo>/`) quando tem lógica/HTML específica daquele módulo — o resto é genérico e vive em `ui/`.

## Modais e Drawers

Nunca implemente overlay/backdrop do zero. `Modal`, `Drawer` e `ConfirmDialog` usam o mesmo `Overlay` (`components/ui/Modal/Overlay.jsx`), que já cuida de: fechar com Esc, fechar ao clicar fora, `role="dialog"` + `aria-modal`, trap de foco e devolver o foco ao elemento que abriu o modal. Ganho automático para qualquer novo modal.

## Tabelas

Sempre `components/ui/Table/Table.jsx` (genérica, responsiva — vira cartões em mobile) + um `columns.jsx` local com a config de colunas do domínio. A coluna de ações (Editar/Excluir, e outras como Baixar/Favoritar) usa `components/ui/Table/RowActions.jsx`, passando botões extra como `children` quando o módulo precisar de mais que Editar/Excluir (veja `InstallerTable.jsx`/`ScriptTable.jsx`).

## Filtros e busca

Componente `<Modulo>Filters` = `Toolbar` + `SearchInput`/`Select`(s) + botão "Limpar filtros". A lógica de filtragem fica em `utils/<modulo>Filter.js`, nunca dentro do componente. Busca por texto sempre via `createSearchMatcher` (`utils/textFilter.js`).

## Integração com Supabase

Toda leitura/escrita passa por `kvGet`/`kvSet` (`services/supabase/kvStore.js`), que já lança erro descritivo se o Supabase não estiver configurado — não chame `supabase.from(...)` direto em um service novo. Autenticação é a única exceção, isolada em `services/supabase/authService.js` + `contexts/AuthProvider.jsx`.

## Gerenciamento de estado

- **Dados do servidor** (o que vem do Supabase): sempre `createQueryHook`/`createCrudMutations` do TanStack Query — nunca `useState` + `useEffect` manual para buscar dado.
- **Estado de UI de uma página CRUD** (ficha aberta, formulário aberto, exclusão pendente, filtros): `useCrudPanelState` + um `useState` local só para os filtros.
- **Estado verdadeiramente global** (sessão, tema, sidebar colapsada, toasts): Context em `src/contexts/`, com o `value` do Provider sempre em `useMemo`/`useCallback` para não re-renderizar a árvore inteira à toa. Separe estado de ações em contexts diferentes se um mudar com muito mais frequência que o outro (veja `ToastStateContext`/`ToastActionsContext`).
- **Nunca** guarde em `useState` algo que já pode ser derivado de outro estado/prop — calcule direto no render ou em `useMemo`.

## Estilos

CSS Modules (`Componente.module.css`), sempre importado como `styles`. Cores/espaçamento/tipografia vêm de `src/styles/tokens.css` (`var(--brand)`, `var(--text-muted)`, etc.) — nunca hardcode um valor que já existe como token. Para CSS repetido entre módulos (ex.: fichas de visualização), use `composes: classe from '../../caminho/Arquivo.module.css'` em vez de copiar as regras (veja `src/styles/viewPanel.module.css` e como `AssetPanel.module.css`/`ContatoPanel.module.css`/etc. o reaproveitam).

## Antes de considerar pronto

```bash
npm run lint
npm run format
npm run build
```

E teste manualmente no navegador o fluxo que você mexeu — o app não tem testes automatizados.
