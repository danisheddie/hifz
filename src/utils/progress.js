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
import { getSurahStatusMap, isMemorizedStatus } from './storage'

const TOTAL_AYAHS = SURAH_AYAHS.reduce((a, b) => a + b, 0)
const TOTAL_JUZ = 30

export async function computeProgress() {
  const statusMap = getSurahStatusMap()
  const memorizedSurahs = new Set()
  let ayahsMemorized = 0
  let surahsMemorized = 0

  for (let i = 0; i < TOTAL_SURAHS; i++) {
    const number = i + 1
    if (isMemorizedStatus(statusMap[number]?.status)) {
      memorizedSurahs.add(number)
      surahsMemorized++
      ayahsMemorized += SURAH_AYAHS[i]
    }
  }

  // Tally every ayah's Juz membership once, so a surah that only partly
  // overlaps a Juz doesn't falsely mark that Juz complete.
  const index = await getAyahPagesIndex()
  const juzTotal = Array(TOTAL_JUZ + 1).fill(0)
  const juzMemorized = Array(TOTAL_JUZ + 1).fill(0)
  if (index) {
    for (const key of Object.keys(index)) {
      const juz = juzForPage(index[key])
      juzTotal[juz]++
      if (memorizedSurahs.has(Number(key.split(':')[0]))) juzMemorized[juz]++
    }
  }
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
