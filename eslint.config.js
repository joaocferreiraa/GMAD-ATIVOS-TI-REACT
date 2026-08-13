import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import eslintConfigPrettier from 'eslint-config-prettier'

export default [
  // agent/ é um projeto Node separado (package.json/node_modules próprios,
  // rodado fora do build da Vercel) — não faz parte deste lint.
  { ignores: ['dist', 'agent'] },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  // api/ roda como Vercel Serverless Function (Node.js), não no navegador —
  // precisa dos globals de Node (Buffer, process...) em vez dos de browser.
  {
    files: ['api/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },
  eslintConfigPrettier,
]
