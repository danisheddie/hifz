// Dashboard progress stats, computed from the status model + the Qur'an
// data layer. Surahs can straddle Juz boundaries, so "Juz completed" is
// worked out at ayah granularity (via ayah-pages.json) even though the
// status model itself is per-surah.

import {
  SURAH_AYAHS,
  TOTAL_SURAHS,
  getAyahPagesIndex,
  juzForPage,
} from './api'
import { getSurahStatusMap, isMemorizedStatus, getAyahStatus, getMemorizedAyahCount } from './storage'

const TOTAL_AYAHS = SURAH_AYAHS.reduce((a, b) => a + b, 0)
const TOTAL_JUZ = 30
const EMPTY_ENTRY = { status: 'new' }

// Tally every ayah's Juz membership once, checking each ayah's own status
// (not just its surah's), so a surah that's only partly memorized — or
// straddles a Juz boundary — doesn't falsely mark that Juz complete. Shared
// by computeProgress() (aggregate count) and computeJuzProgress() (the
// per-Juz breakdown behind the /juz screen) so the iteration isn't repeated.
async function computeJuzTallies(statusMap) {
  const index = await getAyahPagesIndex()
  const juzTotal = Array(TOTAL_JUZ + 1).fill(0)
  const juzMemorized = Array(TOTAL_JUZ + 1).fill(0)
  if (index) {
    for (const key of Object.keys(index)) {
      const juz = juzForPage(index[key])
      const [surahNumber, ayahInSurah] = key.split(':').map(Number)
      juzTotal[juz]++
      const entry = statusMap[surahNumber] || EMPTY_ENTRY
      if (isMemorizedStatus(getAyahStatus(entry, ayahInSurah))) juzMemorized[juz]++
    }
  }
  return { juzTotal, juzMemorized }
}

export async function computeProgress() {
  const statusMap = getSurahStatusMap()
  let ayahsMemorized = 0
  let surahsMemorized = 0

  for (let i = 0; i < TOTAL_SURAHS; i++) {
    const number = i + 1
    const entry = statusMap[number] || EMPTY_ENTRY
    ayahsMemorized += getMemorizedAyahCount(entry, SURAH_AYAHS[i])
    if (isMemorizedStatus(entry.status)) surahsMemorized++
  }

  const { juzTotal, juzMemorized } = await computeJuzTallies(statusMap)
  let juzCompleted = 0
  for (let j = 1; j <= TOTAL_JUZ; j++) {
    if (juzTotal[j] > 0 && juzMemorized[j] === juzTotal[j]) juzCompleted++
  }

  return {
    ayahsMemorized,
    totalAyahs: TOTAL_AYAHS,
    percent: TOTAL_AYAHS ? Math.round((ayahsMemorized / TOTAL_AYAHS) * 100) : 0,
    surahsMemorized,
    totalSurahs: TOTAL_SURAHS,
    juzCompleted,
    totalJuz: TOTAL_JUZ,
  }
}

// Per-Juz breakdown (percent complete, at ayah granularity) behind the /juz
// browsing screen.
export async function computeJuzProgress() {
  const statusMap = getSurahStatusMap()
  const { juzTotal, juzMemorized } = await computeJuzTallies(statusMap)
  return Array.from({ length: TOTAL_JUZ }, (_, i) => {
    const juz = i + 1
    const total = juzTotal[juz]
    const memorized = juzMemorized[juz]
    return { juz, total, memorized, percent: total ? Math.round((memorized / total) * 100) : 0 }
  })
}
