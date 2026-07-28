// One-time data generator: pulls the Qur'an glyph data (quran.com) and the
// translation editions (alquran.cloud) and writes them under public/data/ so
// the app serves its own content (offline, instant, no third-party API at
// runtime). Run once locally:  node scripts/build-quran-data.mjs
//
// Output:
//   public/data/meta.json                 surah names (ar/en)
//   public/data/page/<1..604>.json        per-page glyph lines + verses
//   public/data/translation/<edition>.json   { "2:255": "…", … }

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'public', 'data')

const QURAN = 'https://api.quran.com/api/v4'
const ALQURAN = 'https://api.alquran.cloud/v1'
const TOTAL_PAGES = 604

// Keep in step with TRANSLATIONS + transliteration in src/utils/api.js.
const EDITIONS = [
  'en.asad',
  'en.sahih',
  'ms.basmeih',
  'id.indonesian',
  'en.transliteration',
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url)
      if (res.ok) return await res.json()
      if (res.status === 404) return null
    } catch {
      /* retry */
    }
    await sleep(500 * (i + 1))
  }
  throw new Error(`failed: ${url}`)
}

async function writeJson(file, data) {
  const full = join(OUT, file)
  await mkdir(dirname(full), { recursive: true })
  await writeFile(full, JSON.stringify(data))
}

async function buildMeta() {
  const json = await fetchJson(`${QURAN}/chapters`)
  const meta = {}
  for (const c of json.chapters) {
    meta[c.id] = { ar: c.name_arabic, en: c.name_simple }
  }
  await writeJson('meta.json', meta)
  console.log('✓ meta.json (114 surahs)')
}

async function buildPages() {
  const ayahPages = {}
  for (let p = 1; p <= TOTAL_PAGES; p++) {
    const url =
      `${QURAN}/verses/by_page/${p}` +
      `?words=true&per_page=300&fields=text_uthmani,chapter_id` +
      `&word_fields=code_v2,text_uthmani,page_number,char_type_name,line_number`
    const json = await fetchJson(url)
    const verses = json?.verses || []

    const lineMap = new Map()
    const outVerses = []
    for (const v of verses) {
      const words = []
      let text = ''
      for (const w of v.words || []) {
        const end = w.char_type_name === 'end'
        if (w.code_v2) {
          words.push({ code: w.code_v2, page: w.page_number || p, end })
          const ln = w.line_number || 0
          if (!lineMap.has(ln)) lineMap.set(ln, [])
          lineMap.get(ln).push({ code: w.code_v2, end })
        }
        if (!end && w.text_uthmani) text += (text ? ' ' : '') + w.text_uthmani
      }
      const [surah, ayah] = v.verse_key.split(':').map(Number)
      const vp = v.page_number || p
      if (!(v.verse_key in ayahPages)) ayahPages[v.verse_key] = vp
      outVerses.push({ key: v.verse_key, surah, ayah, num: v.id, page: vp, words, text })
    }
    const lines = [...lineMap.keys()]
      .sort((a, b) => a - b)
      .map((ln) => ({ lineNumber: ln, words: lineMap.get(ln) }))

    await writeJson(`page/${p}.json`, { page: p, lines, verses: outVerses })
    if (p % 50 === 0 || p === TOTAL_PAGES) console.log(`✓ pages ${p}/${TOTAL_PAGES}`)
    await sleep(120)
  }
  await writeJson('ayah-pages.json', ayahPages)
  console.log(`✓ ayah-pages.json (${Object.keys(ayahPages).length} ayahs)`)
}

async function buildTranslations() {
  for (const ed of EDITIONS) {
    const json = await fetchJson(`${ALQURAN}/quran/${ed}`)
    const map = {}
    for (const s of json?.data?.surahs || []) {
      for (const a of s.ayahs || []) {
        map[`${s.number}:${a.numberInSurah}`] = a.text
      }
    }
    await writeJson(`translation/${ed}.json`, map)
    console.log(`✓ translation/${ed}.json (${Object.keys(map).length} ayahs)`)
  }
}

async function main() {
  console.log('Building Qur’an data into public/data/ …')
  await buildMeta()
  await buildTranslations()
  await buildPages()
  console.log('\nDone. Commit public/data/ and deploy.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
