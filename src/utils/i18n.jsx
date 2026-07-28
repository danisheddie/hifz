// Lightweight i18n: a flat key → string dictionary per language, a reactive
// provider so changing the language re-renders the whole app, and a `t()`
// helper with {var} interpolation. Falls back to English, then to the key.

import { createContext, useContext, useMemo, useState } from 'react'
import { getSettings, setSetting } from './storage'

export const LANGUAGES = [
  { id: 'en', name: 'English' },
  { id: 'ms', name: 'Bahasa Melayu' },
  { id: 'id', name: 'Bahasa Indonesia' },
]

const en = {
  'common.appName': 'Hifz',
  'common.appTagline': 'Memorize the Qur’an, one surah at a time.',
  'common.back': 'Back',
  'common.ayah': 'ayah',
  'common.ayahs': 'ayahs',

  'nav.surahs': 'Surahs',

  'home.browseSurahs': 'Browse Surahs',
  'home.subtitle':
    'A calm space to memorize, revise, and reflect on the Qur’an.',

  'status.new': 'New',
  'status.memorizing': 'Memorizing',
  'status.memorized': 'Memorized',
  'status.revision': 'Needs revision',

  'index.title': 'Surahs',
  'index.searchPlaceholder': 'Search by name or number',
  'index.noMatch': 'No surah found.',
  'index.filterAll': 'All',

  'detail.translation': 'Translation',
  'detail.arabicOnly': 'Arabic only',
  'detail.loading': 'Loading…',
  'detail.unable': 'Unable to load. Please check your connection.',
  'detail.tryAgain': 'Try again',

  'dashboard.memorized': 'of the Qur’an memorized',
  'dashboard.juz': '{n} of 30 Juz',
  'dashboard.surahs': '{n} of 114 Surahs',
  'dashboard.currentlyMemorizing': 'Currently memorizing',
  'dashboard.emptyMemorizing': 'Nothing in progress yet — pick a surah to begin.',
  'dashboard.dueForRevision': 'Due for revision',
  'dashboard.lastRevisedNever': 'Not yet revised',
  'dashboard.lastRevisedToday': 'Revised today',
  'dashboard.lastRevisedYesterday': 'Revised yesterday',
  'dashboard.lastRevisedDaysAgo': 'Revised {n} days ago',
}

const ms = {
  'common.appName': 'Hifz',
  'common.appTagline': 'Hafal al-Qur’an, satu surah pada satu masa.',
  'common.back': 'Kembali',
  'common.ayah': 'ayat',
  'common.ayahs': 'ayat',

  'nav.surahs': 'Surah',

  'home.browseSurahs': 'Lihat Surah',
  'home.subtitle':
    'Ruang yang tenang untuk menghafal, mengulang kaji, dan meneliti al-Qur’an.',

  'status.new': 'Baharu',
  'status.memorizing': 'Sedang dihafal',
  'status.memorized': 'Sudah dihafal',
  'status.revision': 'Perlu diulang kaji',

  'index.title': 'Surah',
  'index.searchPlaceholder': 'Cari mengikut nama atau nombor',
  'index.noMatch': 'Tiada surah ditemui.',
  'index.filterAll': 'Semua',

  'detail.translation': 'Terjemahan',
  'detail.arabicOnly': 'Arab sahaja',
  'detail.loading': 'Memuatkan…',
  'detail.unable': 'Tidak dapat dimuatkan. Sila semak sambungan anda.',
  'detail.tryAgain': 'Cuba lagi',

  'dashboard.memorized': 'daripada al-Qur’an dihafal',
  'dashboard.juz': '{n} daripada 30 Juzuk',
  'dashboard.surahs': '{n} daripada 114 Surah',
  'dashboard.currentlyMemorizing': 'Sedang dihafal',
  'dashboard.emptyMemorizing': 'Belum ada yang sedang dihafal — pilih satu surah untuk mula.',
  'dashboard.dueForRevision': 'Perlu diulang kaji',
  'dashboard.lastRevisedNever': 'Belum diulang kaji',
  'dashboard.lastRevisedToday': 'Diulang kaji hari ini',
  'dashboard.lastRevisedYesterday': 'Diulang kaji semalam',
  'dashboard.lastRevisedDaysAgo': 'Diulang kaji {n} hari lalu',
}

const id = {
  'common.appName': 'Hifz',
  'common.appTagline': 'Menghafal Al-Qur’an, satu surah setiap kali.',
  'common.back': 'Kembali',
  'common.ayah': 'ayat',
  'common.ayahs': 'ayat',

  'nav.surahs': 'Surah',

  'home.browseSurahs': 'Lihat Surah',
  'home.subtitle':
    'Ruang tenang untuk menghafal, mengulang, dan merenungkan Al-Qur’an.',

  'status.new': 'Baru',
  'status.memorizing': 'Sedang dihafal',
  'status.memorized': 'Sudah dihafal',
  'status.revision': 'Perlu diulang',

  'index.title': 'Surah',
  'index.searchPlaceholder': 'Cari berdasarkan nama atau nomor',
  'index.noMatch': 'Surah tidak ditemukan.',
  'index.filterAll': 'Semua',

  'detail.translation': 'Terjemahan',
  'detail.arabicOnly': 'Arab saja',
  'detail.loading': 'Memuat…',
  'detail.unable': 'Tidak dapat memuat. Silakan periksa koneksi Anda.',
  'detail.tryAgain': 'Coba lagi',

  'dashboard.memorized': 'dari Al-Qur’an dihafal',
  'dashboard.juz': '{n} dari 30 Juz',
  'dashboard.surahs': '{n} dari 114 Surah',
  'dashboard.currentlyMemorizing': 'Sedang dihafal',
  'dashboard.emptyMemorizing': 'Belum ada yang sedang dihafal — pilih surah untuk mulai.',
  'dashboard.dueForRevision': 'Perlu diulang',
  'dashboard.lastRevisedNever': 'Belum diulang',
  'dashboard.lastRevisedToday': 'Diulang hari ini',
  'dashboard.lastRevisedYesterday': 'Diulang kemarin',
  'dashboard.lastRevisedDaysAgo': 'Diulang {n} hari lalu',
}

const DICT = { en, ms, id }

export function translate(lang, key, vars) {
  const table = DICT[lang] || DICT.en
  let s = table[key] ?? DICT.en[key] ?? key
  if (vars) {
    for (const k of Object.keys(vars)) {
      s = s.split(`{${k}}`).join(String(vars[k]))
    }
  }
  return s
}

const LanguageContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k })

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(() => getSettings().appLang || 'en')
  const value = useMemo(
    () => ({
      lang,
      setLang: (l) => {
        setSetting('appLang', l)
        setLangState(l)
      },
      t: (key, vars) => translate(lang, key, vars),
    }),
    [lang]
  )
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export const useLang = () => useContext(LanguageContext)
