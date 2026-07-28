/* Hifz service worker.
   Responsibilities:
   - Make the app installable.
   - Cache the app so it opens and works offline: the shell + visited surahs,
     translations and QCF fonts are cached as you go (audio is left to stream).

   Caching strategy (kept deliberately simple, no build tooling):
   - Navigations  → network-first, falling back to the cached shell offline.
   - Hashed build assets and QCF fonts (immutable) → cache-first.
   - Local data / icons / fonts / manifest → stale-while-revalidate.
   - Audio and anything else → straight to the network. */

const CACHE = 'hifz-cache-v1'
// '/' on Cloudflare, '/hifz/' on the legacy GitHub build.
const BASE = self.location.pathname.replace(/sw\.js$/, '')

self.addEventListener('install', (event) => {
  // Precache the shell so the app can open offline after the first visit.
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.add(BASE))
      .catch(() => {})
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

function isFontCdn(url) {
  return url.hostname === 'cdn.jsdelivr.net'
}
function pathHas(url, seg) {
  return url.pathname.includes(seg)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  // Navigations: serve fresh when online (so new asset hashes load), fall back
  // to the cached shell when offline — the SPA boots and routes client-side.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          caches.open(CACHE).then((c) => c.put(BASE, res.clone())).catch(() => {})
          return res
        })
        .catch(async () => (await caches.match(BASE)) || Response.error())
    )
    return
  }

  // Only handle same-origin requests and the QCF font CDN. Audio and other
  // cross-origin requests fall through to the browser (range streaming intact).
  if (!sameOrigin && !isFontCdn(url)) return

  // Immutable: hashed build assets and QCF fonts → cache-first.
  if (isFontCdn(url) || (sameOrigin && pathHas(url, '/assets/'))) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Local content that can change rarely → stale-while-revalidate.
  if (
    sameOrigin &&
    (pathHas(url, '/data/') ||
      pathHas(url, '/icons/') ||
      pathHas(url, '/fonts/') ||
      pathHas(url, 'manifest.webmanifest'))
  ) {
    event.respondWith(staleWhileRevalidate(request))
  }
})

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const res = await fetch(request)
    if (res.ok || res.type === 'opaque') {
      const c = await caches.open(CACHE)
      c.put(request, res.clone())
    }
    return res
  } catch {
    return cached || Response.error()
  }
}

async function staleWhileRevalidate(request) {
  const c = await caches.open(CACHE)
  const cached = await c.match(request)
  const network = fetch(request)
    .then((res) => {
      if (res.ok) c.put(request, res.clone())
      return res
    })
    .catch(() => null)
  return cached || (await network) || Response.error()
}
