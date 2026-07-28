// Tafsir (per-ayah exegesis), fetched from the quran.com API and cached in
// localStorage — the text never changes, so once fetched it's free forever.
// There's no bundled/local tafsir data (unlike the Qur'an text itself), so
// this only works online; the UI degrades to "couldn't load" when it can't
// reach the API.

const API = 'https://api.quran.com/api/v4'

const RESOURCE_CACHE_KEY = 'hifz:tafsirResource:en'
let resourceIdPromise

function readCache(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? null : JSON.parse(raw)
  } catch {
    return null
  }
}
function writeCache(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable — fail quietly */
  }
}

// Resolves (once) which English tafsir resource to use, preferring Ibn
// Kathir, then al-Jalalayn, then whatever the API offers first — rather than
// hardcoding a resource id that could silently go stale.
async function resolveResourceId() {
  const cached = readCache(RESOURCE_CACHE_KEY)
  if (cached) return cached

  const res = await fetch(`${API}/resources/tafsirs?language=en`)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const json = await res.json()
  const list = json?.tafsirs || []
  if (!list.length) throw new Error('No English tafsir available.')

  const byName = (needle) =>
    list.find((r) => (r.name || '').toLowerCase().includes(needle))
  const pick = byName('ibn kathir') || byName('jalalayn') || list[0]

  const result = { id: pick.id, name: pick.name }
  writeCache(RESOURCE_CACHE_KEY, result)
  return result
}

function getResourceId() {
  if (!resourceIdPromise) resourceIdPromise = resolveResourceId()
  return resourceIdPromise
}

// The API returns rich HTML (paragraphs, footnote markup). Strip it down to
// plain text via a detached element (decodes entities; never inserted into
// the document, so nothing in it executes) rather than rendering raw HTML
// from a third party.
function htmlToText(html) {
  const div = document.createElement('div')
  div.innerHTML = html.replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n')
  return (div.textContent || '').trim()
}

// Fetch (and cache) the tafsir for one ayah, e.g. ayahKey "2:255".
export async function getTafsir(ayahKey) {
  const resource = await getResourceId()
  const cacheKey = `hifz:tafsir:${resource.id}:${ayahKey}`
  const cached = readCache(cacheKey)
  if (cached) return cached

  const res = await fetch(`${API}/tafsirs/${resource.id}/by_ayah/${ayahKey}`)
  if (!res.ok) throw new Error(`Request failed (${res.status})`)
  const json = await res.json()
  const rawText = json?.tafsir?.text
  if (!rawText) throw new Error('No tafsir text in response.')

  const result = {
    text: htmlToText(rawText),
    resourceName: json?.tafsir?.resource_name || resource.name,
  }
  writeCache(cacheKey, result)
  return result
}
