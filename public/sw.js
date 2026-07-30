/* Hifz service worker.
   Responsibilities:
   - Make the app installable.
   - Cache the app so it works fully offline: the shell (JS/CSS — a single
     bundle, so one visit to any page caches the whole app) plus the ENTIRE
     Qur'an dataset (meta, all 604 pages, ayah-pages index, every
     translation edition) are precached in the background right after
     install, not just pages the user happens to visit. It's ~14MB of text,
     small enough to fetch once and keep.

   Deliberately NOT precached:
   - The QCF per-page glyph fonts (external CDN, jsdelivr) — still cached
     lazily as pages are viewed. Offline-and-never-visited pages fall back
     to the self-hosted KFGQPC Uthmanic Hafs font, which is bundled with the
     app shell and needs no network at all, so text is never unreadable
     offline — just not in the exact per-page mushaf glyph.
   - Audio (streamed, not meant to be stored) and tafsir (a third-party API
     with no bulk-fetch endpoint — pre-fetching it for all 6236 ayahs would
     mean thousands of requests per install).

   Caching strategy:
   - Navigations  → network-first, falling back to the cached shell offline.
   - Hashed build assets and QCF fonts (immutable) → cache-first.
   - Local data / icons / fonts / manifest → stale-while-revalidate (also
     acts as a safety net for anything the bulk precache below missed). */

const CACHE = 'hifz-cache-v2'
// '/' on Cloudflare, '/hifz/' on the legacy GitHub build.
const BASE = self.location.pathname.replace(/sw\.js$/, '')
const DATA_BASE = `${BASE}data/`

const TOTAL_PAGES = 604
// Keep in sync with TRANSLATIONS/TRANSLITERATION in src/utils/api.js.
const TRANSLATION_EDITIONS = [
  'en.asad',
  'en.sahih',
  'en.transliteration',
  'ms.basmeih',
  'id.indonesian',
]

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
  // Fire-and-forget: doesn't block activation completing. The app already
  // works (network-first, caching as you go) while this fills in the rest.
  precacheQuranData()
})

// Fetches and caches every page/translation file the app ships, so the
// whole Qur'an is available offline soon after install — not just whatever
// the user happened to open first.
async function precacheQuranData() {
  const cache = await caches.open(CACHE)
  const urls = [
    `${DATA_BASE}meta.json`,
    `${DATA_BASE}ayah-pages.json`,
    ...Array.from({ length: TOTAL_PAGES }, (_, i) => `${DATA_BASE}page/${i + 1}.json`),
    ...TRANSLATION_EDITIONS.map((e) => `${DATA_BASE}translation/${e}.json`),
  ]
  await Promise.allSettled(
    urls.map(async (url) => {
      if (await cache.match(url)) return // already cached, don't refetch
      const res = await fetch(url)
      if (res.ok) await cache.put(url, res)
    })
  )
}

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
