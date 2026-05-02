// FormWise service worker — offline shell + history fallback.
//
// Conservative strategy:
//   - Static assets:  cache-first with network fallback
//   - Navigation:     network-first with cached shell fallback (if offline)
//   - API requests:   network-only (never cache user data or AI responses)
//
// We keep this under 100 lines so it's easy to audit. No third-party
// imports. No precaching of routes — Next.js handles that with its own
// asset hashes via /_next/static/* (cached by long-cache headers).

const VERSION = 'v1'
const SHELL_CACHE = `formwise-shell-${VERSION}`
const SHELL_URLS = [
  '/',
  '/icon.svg',
  '/manifest.webmanifest',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith('formwise-') && k !== SHELL_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)

  // Never cache API or auth endpoints — always go to the network.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/auth/')) {
    return // default fetch
  }

  // HTML navigations: network-first, fall back to cached "/" shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Optionally update the shell cache with the latest "/"
          if (url.pathname === '/' && res.ok) {
            const clone = res.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put('/', clone))
          }
          return res
        })
        .catch(() =>
          caches.match('/').then((cached) => cached || new Response('Offline', { status: 503 }))
        )
    )
    return
  }

  // Static assets (Next.js _next/static/*): cache-first, fall back to network.
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(req).then((cached) => {
        if (cached) return cached
        return fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone()
            caches.open(SHELL_CACHE).then((cache) => cache.put(req, clone))
          }
          return res
        })
      })
    )
  }
})
