// All localStorage read/write logic for Hifz lives here. Keeping it in one
// place keeps components free of storage details.

const KEYS = {
  settings: 'hifz:settings',
  surahStatus: 'hifz:surahStatus',
  onboarded: 'hifz:onboarded',
  name: 'hifz:userName',
  bookmarks: 'hifz:bookmarks',
  installDismissed: 'hifz:installDismissed',
}

// The four memorization states a surah (or an ayah range within it) can be in.
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
  showTafsir: false,
  reciter: 'ar.alafasy',
  // How many times a single ayah (or a looped range) repeats before
  // stopping: 1 | 3 | 5 | 10 | 'inf'.
  repeatCount: 3,
}

export const REPEAT_OPTIONS = [1, 3, 5, 10, 'inf']

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
// { [surahNumber]: { status, lastRevised, updatedAt, notes } }.

const DEFAULT_ENTRY = { status: 'new', lastRevised: null, updatedAt: null, notes: '' }

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
    // A whole-surah status change is a deliberate override — it replaces
    // any per-ayah ranges rather than merging with them.
    ranges: undefined,
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

// --- per-ayah ranges (optional overlay on a surah's whole status) ---------
// entry.ranges, when present, is a sorted list of non-overlapping
// { from, to, status } spans (1-indexed ayah numbers within the surah,
// inclusive). An ayah not covered by any range is implicitly 'new'. Most
// surahs never carry this — it only appears once a surah's progress is
// no longer uniform (e.g. "just the last 2 ayat"), and collapses back to
// the plain `status` field whenever a range operation makes it uniform
// again, so the common case stays as light as before.

function mergeAdjacentRanges(ranges) {
  const sorted = [...ranges].sort((a, b) => a.from - b.from)
  const merged = []
  for (const seg of sorted) {
    const last = merged[merged.length - 1]
    if (last && last.status === seg.status && seg.from <= last.to + 1) {
      last.to = Math.max(last.to, seg.to)
    } else {
      merged.push({ ...seg })
    }
  }
  return merged
}

// A surah-level summary derived from its ranges, for contexts that only
// care about one status per surah (index ring, dashboard, revision list).
// Priority: not fully covered → 'memorizing' (still in progress), even if
// part of what's covered needs revision — that only surfaces once the
// whole surah is covered, so a barely-started surah never reads as done.
function deriveSurahStatus(ranges, ayahCount) {
  const covered = ranges.reduce((sum, r) => sum + (r.to - r.from + 1), 0)
  if (covered === 0) return 'new'
  if (covered < ayahCount) return 'memorizing'
  if (ranges.some((r) => r.status === 'revision')) return 'revision'
  if (ranges.some((r) => r.status === 'memorizing')) return 'memorizing'
  return 'memorized'
}

// Collapses a raw (possibly gap-free-but-fragmented) range list into either
// a plain whole-surah status (ranges undefined) or a normalized ranges array.
function normalizeRanges(ranges, ayahCount) {
  const merged = mergeAdjacentRanges(ranges.filter((r) => r.status !== 'new'))
  if (merged.length === 0) return { status: 'new', ranges: undefined }
  if (merged.length === 1 && merged[0].from === 1 && merged[0].to === ayahCount) {
    return { status: merged[0].status, ranges: undefined }
  }
  return { status: deriveSurahStatus(merged, ayahCount), ranges: merged }
}

// The status a specific ayah (1-indexed within its surah) currently has.
export function getAyahStatus(entry, numberInSurah) {
  if (entry.ranges && entry.ranges.length) {
    const r = entry.ranges.find((r) => numberInSurah >= r.from && numberInSurah <= r.to)
    return r ? r.status : 'new'
  }
  return entry.status || 'new'
}

// How many of a surah's ayahs count toward "memorized" progress (memorized
// + revision, same rule as isMemorizedStatus) — ayah-accurate when ranges
// exist, otherwise all-or-nothing like before.
export function getMemorizedAyahCount(entry, ayahCount) {
  if (entry.ranges && entry.ranges.length) {
    return entry.ranges
      .filter((r) => isMemorizedStatus(r.status))
      .reduce((sum, r) => sum + (r.to - r.from + 1), 0)
  }
  return isMemorizedStatus(entry.status) ? ayahCount : 0
}

// Whether a surah has any ayahs flagged for revision right now — checked
// independently of the derived summary status (which only reads 'revision'
// once the whole surah is covered), so a revision range surfaces in the
// Revision screen even while the rest of the surah is still being memorized.
export function hasRevisionRanges(entry) {
  if (!entry) return false
  if (entry.ranges && entry.ranges.length) {
    return entry.ranges.some((r) => r.status === 'revision')
  }
  return entry.status === 'revision'
}

// Sets [fromAyah, toAyah] (inclusive, 1-indexed within the surah) to
// `status`, splitting/overwriting whatever ranges already cover that span.
export function setAyahRangeStatus(number, fromAyah, toAyah, status, ayahCount) {
  const map = getSurahStatusMap()
  const prev = map[number] || DEFAULT_ENTRY

  // Expand the current state into segments so overlapping the new range in
  // is just interval clipping, whether it started as ranges or one status.
  const segments =
    prev.ranges && prev.ranges.length
      ? prev.ranges.map((r) => ({ ...r }))
      : prev.status && prev.status !== 'new'
      ? [{ from: 1, to: ayahCount, status: prev.status }]
      : []

  const clipped = []
  for (const seg of segments) {
    if (seg.to < fromAyah || seg.from > toAyah) {
      clipped.push(seg)
      continue
    }
    if (seg.from < fromAyah) clipped.push({ from: seg.from, to: fromAyah - 1, status: seg.status })
    if (seg.to > toAyah) clipped.push({ from: toAyah + 1, to: seg.to, status: seg.status })
  }
  clipped.push({ from: fromAyah, to: toAyah, status })

  const { status: nextStatus, ranges: nextRanges } = normalizeRanges(clipped, ayahCount)
  const now = new Date().toISOString()
  const next = {
    ...prev,
    status: nextStatus,
    ranges: nextRanges,
    updatedAt: now,
    lastRevised: status === 'memorized' ? now : prev.lastRevised,
  }
  map[number] = next
  write(KEYS.surahStatus, map)
  return next
}

// RevisionScreen's "mark confident": promotes only the ayahs actually
// flagged `revision`, leaving any still-`memorizing` ranges untouched —
// unlike setSurahStatus, which is a deliberate whole-surah override.
export function markRevisionConfident(number, ayahCount) {
  const map = getSurahStatusMap()
  const prev = map[number] || DEFAULT_ENTRY
  const now = new Date().toISOString()

  if (!prev.ranges || !prev.ranges.length) {
    const next = { ...prev, status: 'memorized', ranges: undefined, updatedAt: now, lastRevised: now }
    map[number] = next
    write(KEYS.surahStatus, map)
    return next
  }

  const promoted = prev.ranges.map((r) => (r.status === 'revision' ? { ...r, status: 'memorized' } : r))
  const { status: nextStatus, ranges: nextRanges } = normalizeRanges(promoted, ayahCount)
  const next = { ...prev, status: nextStatus, ranges: nextRanges, updatedAt: now, lastRevised: now }
  map[number] = next
  write(KEYS.surahStatus, map)
  return next
}

// --- per-surah tadabbur notes --------------------------------------------

export function getSurahNotes(number) {
  return getSurahEntry(number).notes || ''
}

export function setSurahNotes(number, notes) {
  const map = getSurahStatusMap()
  const prev = map[number] || DEFAULT_ENTRY
  map[number] = { ...prev, notes }
  write(KEYS.surahStatus, map)
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

// --- bookmarks -------------------------------------------------------------
// A flat list of { surah, ayah, createdAt } — one entry per bookmarked ayah
// (surah/ayah numbers, not a global ayah id), keyed by surah+ayah so
// toggling is idempotent regardless of how it's called.

export function getBookmarks() {
  return read(KEYS.bookmarks, [])
}

export function isBookmarked(surah, ayah) {
  return getBookmarks().some((b) => b.surah === surah && b.ayah === ayah)
}

export function toggleBookmark(surah, ayah) {
  const list = getBookmarks()
  const idx = list.findIndex((b) => b.surah === surah && b.ayah === ayah)
  const next =
    idx >= 0
      ? list.filter((_, i) => i !== idx)
      : [...list, { surah, ayah, createdAt: new Date().toISOString() }]
  write(KEYS.bookmarks, next)
  return next
}

// --- onboarding + name ---------------------------------------------------

export function isOnboarded() {
  return read(KEYS.onboarded, false) === true
}

export function getName() {
  const name = read(KEYS.name, '')
  return typeof name === 'string' ? name : ''
}

export function setName(name) {
  const clean = typeof name === 'string' ? name.trim().slice(0, 40) : ''
  write(KEYS.name, clean)
}

export function completeOnboarding(name) {
  setName(name)
  write(KEYS.onboarded, true)
}

// --- add-to-home-screen prompt ------------------------------------------

export function isInstallDismissed() {
  return read(KEYS.installDismissed, false) === true
}

export function dismissInstall() {
  write(KEYS.installDismissed, true)
}
