// Service Worker minimalista: cacheia SÓ os arquivos de /assets/ (JS/CSS
// gerados pelo build do Vite, cada um com hash de conteúdo no nome —
// "AtivosPage-CJ-qgas2.js" nunca muda de conteúdo sob o mesmo nome, então
// cache-first é sempre seguro e nunca serve algo desatualizado).
//
// De propósito, NUNCA intercepta:
// - navegação/HTML (index.html) — sempre busca fresco na rede, pra não
//   brigar com a recuperação automática de "chunk desatualizado pós-deploy"
//   já existente em src/router/RouteErrorBoundary.jsx;
// - /api/* (funções serverless de speedtest) e chamadas ao Supabase — dados
//   sempre precisam vir da rede, nunca de cache, conforme pedido.
const CACHE_NAME = 'gmad-ti-assets-v1' // suba a versão só se a lógica abaixo mudar de forma incompatível
const ASSET_PATH_PREFIX = '/assets/'
const MAX_ENTRIES = 80

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))),
      )
      .then(() => self.clients.claim()),
  )
})

async function trimCache(cache, maxEntries) {
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((key) => cache.delete(key)))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (!url.pathname.startsWith(ASSET_PATH_PREFIX)) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request)
      if (cached) return cached

      const response = await fetch(request)
      if (response.ok) {
        cache.put(request, response.clone())
        trimCache(cache, MAX_ENTRIES)
      }
      return response
    }),
  )
})
