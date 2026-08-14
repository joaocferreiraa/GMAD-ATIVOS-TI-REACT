import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import './styles/print.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Só em produção: em dev o Vite serve os módulos sem hash de conteúdo (via
// /@fs/, /src/, HMR), e um Service Worker no meio disso é fonte clássica de
// bug difícil de diagnosticar (cache pisando no HMR). Ver public/sw.js.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {})
  })
}
