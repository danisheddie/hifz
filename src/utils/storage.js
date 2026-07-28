// All localStorage read/write logic for Hifz lives here. Keeping it in one
// place keeps components free of storage details.

const KEYS = {
  settings: 'hifz:settings',
  surahStatus: 'hifz:surahStatus',
}

// The four memorization states a surah can be in (MVP is per-surah; a
// per-ayah model is a heavier future extension — confirm before building it).
export const STATUSES = ['new', 'memorizing', 'memorized', 'revision']

// 'revision' surahs are still memorized (just flagged as needing review), so
// both states count toward "memorized" progress stats.
export function isMemorizedStatus(status) {
  return status === 'memorized' || status === 'revision'
}

export const DEFAULT_SETTINGS = {
  // App UI language: 'en' | 'ms' | 'id'.
  appLang: 'en',
  // Theme: 'light' | 'dark' | 'sepia'.
  theme: 'light',
  // Arabic reading size: 's' | 'm' | 'l'.
  readingSize: 'm',
  showTranslation: true,
  translationEdition: 'en.asad',
}

function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable — fail quietly */
  }
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) }
}

export function setSetting(key, value) {
  const next = { ...getSettings(), [key]: value }
  write(KEYS.settings, next)
  return next
}

// --- per-surah status --------------------------------------------------
// { [surahNumber]: { status, lastRevised, updatedAt } }. `notes` (tadabbur)
// joins this record in the next phase.

const DEFAULT_ENTRY = { status: 'new', lastRevised: null, updatedAt: null }

export function getSurahStatusMap() {
  return read(KEYS.surahStatus, {})
}

export function getSurahEntry(number) {
  return { ...DEFAULT_ENTRY, ...getSurahStatusMap()[number] }
}

export function getSurahStatus(number) {
  return getSurahEntry(number).status
}

export function setSurahStatus(number, status) {
  const map = getSurahStatusMap()
  const prev = map[number] || DEFAULT_ENTRY
  const now = new Date().toISOString()
  const next = {
    ...prev,
    status,
    updatedAt: now,
    // Reaching "memorized" (fully confident) is what starts the revision
    // clock; flagging "revision" just means it's due, not that it was just
    // reviewed — that's the Revision screen's "mark revised" action.
    lastRevised: status === 'memorized' ? now : prev.lastRevised,
  }
  map[number] = next
  write(KEYS.surahStatus, map)
  return next
}

// Counts of surahs in each status, for dashboard/index chips.
export function getStatusCounts() {
  const map = getSurahStatusMap()
  const counts = { new: 0, memorizing: 0, memorized: 0, revision: 0 }
  for (let n = 1; n <= 114; n++) {
    const status = map[n]?.status || 'new'
    counts[status] = (counts[status] || 0) + 1
  }
  return counts
}
