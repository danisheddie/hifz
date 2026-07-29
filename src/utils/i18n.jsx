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
  'common.continue': 'Continue',
  'common.ayah': 'ayah',
  'common.ayahs': 'ayahs',

  'nav.surahs': 'Surahs',

  'onboarding.welcomeBody':
    'A calm space to memorize, revise, and reflect on the Qur’an — at your own pace.',
  'onboarding.begin': 'Begin',
  'onboarding.nameTitle': 'What should we call you?',
  'onboarding.nameSub': 'So the app can greet you properly.',
  'onboarding.namePlaceholder': 'Your name',
  'onboarding.quickStartTitle': 'Already memorized something?',
  'onboarding.quickStartSub':
    'Pick any surahs you already know by heart. You can always update this later.',
  'onboarding.skipForNow': 'Skip for now',
  'onboarding.bismillahMeaning': 'In the name of Allah, the Most Gracious, the Most Merciful.',
  'onboarding.enter': 'Enter',

  'home.browseSurahs': 'Browse Surahs',
  'home.subtitle':
    'A calm space to memorize, revise, and reflect on the Qur’an.',
  'home.greeting': 'Assalamu’alaikum',
  'home.greetingName': 'Assalamu’alaikum, {name}',
  'home.messageBegin': 'Ready whenever you are — pick a surah to begin.',
  'home.messageRevision': 'A few surahs are ready for a gentle revisit.',
  'home.messageOneSurah': 'Keep going on {surah} — you’re building it up.',
  'home.messageMemorizing': 'A few surahs are in progress — keep going.',
  'home.messageCaughtUp': 'You’re all caught up. Well done.',

  'status.new': 'New',
  'status.memorizing': 'Memorizing',
  'status.memorized': 'Memorized',
  'status.revision': 'Needs revision',

  'index.title': 'Surahs',
  'index.searchPlaceholder': 'Search by name or number',
  'index.noMatch': 'No surah found.',
  'index.filterAll': 'All',
  'index.select': 'Select',
  'index.done': 'Done',
  'index.selectedCount': '{n} selected',
  'index.markMemorized': 'Mark memorized',
  'index.clearSelection': 'Clear',

  'detail.translation': 'Translation',
  'detail.arabicOnly': 'Arabic only',
  'detail.loading': 'Loading…',
  'detail.unable': 'Unable to load. Please check your connection.',
  'detail.tryAgain': 'Try again',
  'detail.ayahProgress': '{done} of {total} ayat memorized',

  'ayahRange.mark': 'Mark ayat',
  'ayahRange.selectHint': 'Tap two ayat to set the range.',
  'ayahRange.label': 'Ayah {start}–{end}',
  'ayahRange.labelSingle': 'Ayah {n}',

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
  'dashboard.seeAll': 'See all {n}',

  'revision.empty': 'Nothing needs revision right now.',
  'revision.markConfident': 'Mark confident',

  'notes.title': 'Tadabbur notes',
  'notes.placeholder': 'What did you reflect on while memorizing this surah?',

  'tafsir.title': 'Tafsir',
  'tafsir.toggle': 'Show tafsir',
  'tafsir.loading': 'Loading tafsir…',
  'tafsir.unable': 'Couldn’t load tafsir. Check your connection and try again.',

  'options.reading': 'Reading',
  'options.practice': 'Practice',

  'test.mode.off': 'Test yourself: Off',
  'test.mode.hide': 'Test yourself: Hidden',
  'test.mode.firstWord': 'Test yourself: First word',
  'test.tapToReveal': 'Tap to reveal',

  'audio.play': 'Play',
  'audio.pause': 'Pause',
  'audio.repeat': 'Repeat ×{n}',
  'audio.loopRange': 'Loop range',
  'audio.selectRangeHint': 'Tap two ayahs to set the loop range.',
  'audio.rangeStart': 'Start',
  'audio.rangeEnd': 'End',
  'audio.loopingRange': 'Looping ayah {start}–{end}',
  'audio.clearRange': 'Clear loop range',

  'settings.title': 'Settings',
  'settings.language': 'App language',
  'settings.theme': 'Theme',
  'settings.theme.light': 'Light',
  'settings.theme.dark': 'Dark',
  'settings.theme.sepia': 'Sepia',
  'settings.yourName': 'Your name',

  'sync.title': 'Back up & sync',
  'sync.intro':
    'Optional. Keep your progress backed up and in sync across devices — sign in with Google, or use a private sync code. The app works fully without this.',
  'sync.notConnected':
    'Sync isn’t connected yet. It activates once the sync service is set up.',
  'sync.orUseCode': 'or use a sync code',
  'sync.yourCode': 'Your sync code',
  'sync.copy': 'Copy',
  'sync.codeHint':
    'Enter this code on another device to restore your progress there. Keep it private — anyone with it can read your data.',
  'sync.syncNow': 'Sync now',
  'sync.stop': 'Stop syncing',
  'sync.createCode': 'Create a sync code',
  'sync.haveCode': 'Already have a code?',
  'sync.restore': 'Restore',
  'sync.created': 'Sync code created. Save it somewhere safe.',
  'sync.restored': 'Restored and synced. Your progress is now backed up.',
  'sync.synced': 'Synced.',
  'sync.syncFail': 'Sync failed. Check your connection and try again.',
  'sync.stopped': 'This device is no longer syncing. Your data stays on it.',
  'sync.copied': 'Code copied to clipboard.',
  'sync.createFail': 'Could not create a sync code.',
  'sync.linkFail': 'Could not link that code.',

  'google.synced': 'Syncing across your devices via Google. ✓',
  'google.signOut': 'Sign out',
  'google.hint': 'Sign in once on each device and your progress stays in sync automatically.',
  'google.signingIn': 'Signing in…',
  'google.loadFail': 'Could not load Google sign-in.',
  'google.signInFail': 'Sign-in failed.',
}

const ms = {
  'common.appName': 'Hifz',
  'common.appTagline': 'Hafal al-Qur’an, satu surah pada satu masa.',
  'common.back': 'Kembali',
  'common.continue': 'Teruskan',
  'common.ayah': 'ayat',
  'common.ayahs': 'ayat',

  'nav.surahs': 'Surah',

  'onboarding.welcomeBody':
    'Ruang yang tenang untuk menghafal, mengulang kaji, dan meneliti al-Qur’an — mengikut kadar anda sendiri.',
  'onboarding.begin': 'Mula',
  'onboarding.nameTitle': 'Apa nama panggilan anda?',
  'onboarding.nameSub': 'Supaya aplikasi boleh menyapa anda dengan sepatutnya.',
  'onboarding.namePlaceholder': 'Nama anda',
  'onboarding.quickStartTitle': 'Sudah menghafal sesuatu?',
  'onboarding.quickStartSub':
    'Pilih mana-mana surah yang anda sudah hafal. Anda boleh kemas kini ini kemudian.',
  'onboarding.skipForNow': 'Langkau buat masa ini',
  'onboarding.bismillahMeaning': 'Dengan nama Allah Yang Maha Pemurah lagi Maha Mengasihani.',
  'onboarding.enter': 'Masuk',

  'home.browseSurahs': 'Lihat Surah',
  'home.subtitle':
    'Ruang yang tenang untuk menghafal, mengulang kaji, dan meneliti al-Qur’an.',
  'home.greeting': 'Assalamualaikum',
  'home.greetingName': 'Assalamualaikum, {name}',
  'home.messageBegin': 'Sedia bila-bila masa — pilih satu surah untuk bermula.',
  'home.messageRevision': 'Beberapa surah sudah sedia untuk diulang kaji semula.',
  'home.messageOneSurah': 'Teruskan usaha pada {surah} — anda sedang membinanya.',
  'home.messageMemorizing': 'Beberapa surah sedang dalam proses — teruskan.',
  'home.messageCaughtUp': 'Semuanya sudah dikemas kini. Syabas.',

  'status.new': 'Baharu',
  'status.memorizing': 'Sedang dihafal',
  'status.memorized': 'Sudah dihafal',
  'status.revision': 'Perlu diulang kaji',

  'index.title': 'Surah',
  'index.searchPlaceholder': 'Cari mengikut nama atau nombor',
  'index.noMatch': 'Tiada surah ditemui.',
  'index.filterAll': 'Semua',
  'index.select': 'Pilih',
  'index.done': 'Selesai',
  'index.selectedCount': '{n} dipilih',
  'index.markMemorized': 'Tandakan sudah dihafal',
  'index.clearSelection': 'Kosongkan',

  'detail.translation': 'Terjemahan',
  'detail.arabicOnly': 'Arab sahaja',
  'detail.loading': 'Memuatkan…',
  'detail.unable': 'Tidak dapat dimuatkan. Sila semak sambungan anda.',
  'detail.tryAgain': 'Cuba lagi',
  'detail.ayahProgress': '{done} daripada {total} ayat dihafal',

  'ayahRange.mark': 'Tandakan ayat',
  'ayahRange.selectHint': 'Ketik dua ayat untuk menetapkan julat.',
  'ayahRange.label': 'Ayat {start}–{end}',
  'ayahRange.labelSingle': 'Ayat {n}',

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
  'dashboard.seeAll': 'Lihat semua {n}',

  'revision.empty': 'Tiada apa yang perlu diulang kaji sekarang.',
  'revision.markConfident': 'Tandakan yakin',

  'notes.title': 'Nota tadabbur',
  'notes.placeholder': 'Apakah renungan anda semasa menghafal surah ini?',

  'tafsir.title': 'Tafsir',
  'tafsir.toggle': 'Tunjuk tafsir',
  'tafsir.loading': 'Memuatkan tafsir…',
  'tafsir.unable': 'Tidak dapat memuatkan tafsir. Semak sambungan anda dan cuba lagi.',

  'options.reading': 'Bacaan',
  'options.practice': 'Latihan',

  'test.mode.off': 'Uji diri: Tutup',
  'test.mode.hide': 'Uji diri: Disembunyikan',
  'test.mode.firstWord': 'Uji diri: Perkataan pertama',
  'test.tapToReveal': 'Ketik untuk dedah',

  'audio.play': 'Main',
  'audio.pause': 'Jeda',
  'audio.repeat': 'Ulang ×{n}',
  'audio.loopRange': 'Gelung julat',
  'audio.selectRangeHint': 'Ketik dua ayat untuk menetapkan julat gelung.',
  'audio.rangeStart': 'Mula',
  'audio.rangeEnd': 'Akhir',
  'audio.loopingRange': 'Mengulang ayat {start}–{end}',
  'audio.clearRange': 'Kosongkan julat gelung',

  'settings.title': 'Tetapan',
  'settings.language': 'Bahasa aplikasi',
  'settings.theme': 'Tema',
  'settings.theme.light': 'Cerah',
  'settings.theme.dark': 'Gelap',
  'settings.theme.sepia': 'Sepia',
  'settings.yourName': 'Nama anda',

  'sync.title': 'Sandaran & penyegerakan',
  'sync.intro':
    'Pilihan. Kekalkan kemajuan anda tersandar dan segerak merentas peranti — log masuk dengan Google, atau guna kod penyegerakan peribadi. Aplikasi berfungsi sepenuhnya tanpa ini.',
  'sync.notConnected':
    'Penyegerakan belum disambung. Ia aktif setelah perkhidmatan disediakan.',
  'sync.orUseCode': 'atau guna kod penyegerakan',
  'sync.yourCode': 'Kod penyegerakan anda',
  'sync.copy': 'Salin',
  'sync.codeHint':
    'Masukkan kod ini pada peranti lain untuk memulihkan kemajuan anda di sana. Rahsiakan ia — sesiapa yang memilikinya boleh membaca data anda.',
  'sync.syncNow': 'Segerak sekarang',
  'sync.stop': 'Henti penyegerakan',
  'sync.createCode': 'Cipta kod penyegerakan',
  'sync.haveCode': 'Sudah ada kod?',
  'sync.restore': 'Pulih',
  'sync.created': 'Kod penyegerakan dicipta. Simpan di tempat yang selamat.',
  'sync.restored': 'Dipulihkan dan disegerakkan. Kemajuan anda kini tersandar.',
  'sync.synced': 'Disegerakkan.',
  'sync.syncFail': 'Penyegerakan gagal. Semak sambungan dan cuba lagi.',
  'sync.stopped': 'Peranti ini tidak lagi disegerakkan. Data anda kekal padanya.',
  'sync.copied': 'Kod disalin ke papan keratan.',
  'sync.createFail': 'Tidak dapat mencipta kod penyegerakan.',
  'sync.linkFail': 'Tidak dapat memautkan kod itu.',

  'google.synced': 'Disegerakkan merentas peranti anda melalui Google. ✓',
  'google.signOut': 'Log keluar',
  'google.hint': 'Log masuk sekali pada setiap peranti dan kemajuan anda kekal segerak secara automatik.',
  'google.signingIn': 'Sedang log masuk…',
  'google.loadFail': 'Tidak dapat memuatkan log masuk Google.',
  'google.signInFail': 'Log masuk gagal.',
}

const id = {
  'common.appName': 'Hifz',
  'common.appTagline': 'Menghafal Al-Qur’an, satu surah setiap kali.',
  'common.back': 'Kembali',
  'common.continue': 'Lanjutkan',
  'common.ayah': 'ayat',
  'common.ayahs': 'ayat',

  'nav.surahs': 'Surah',

  'onboarding.welcomeBody':
    'Ruang tenang untuk menghafal, mengulang, dan merenungkan Al-Qur’an — sesuai kecepatan Anda sendiri.',
  'onboarding.begin': 'Mulai',
  'onboarding.nameTitle': 'Siapa nama Anda?',
  'onboarding.nameSub': 'Agar aplikasi bisa menyapa Anda dengan tepat.',
  'onboarding.namePlaceholder': 'Nama Anda',
  'onboarding.quickStartTitle': 'Sudah hafal sesuatu?',
  'onboarding.quickStartSub':
    'Pilih surah yang sudah Anda hafal. Anda selalu bisa memperbarui ini nanti.',
  'onboarding.skipForNow': 'Lewati dulu',
  'onboarding.bismillahMeaning': 'Dengan nama Allah Yang Maha Pengasih, Maha Penyayang.',
  'onboarding.enter': 'Masuk',

  'home.browseSurahs': 'Lihat Surah',
  'home.subtitle':
    'Ruang tenang untuk menghafal, mengulang, dan merenungkan Al-Qur’an.',
  'home.greeting': 'Assalamualaikum',
  'home.greetingName': 'Assalamualaikum, {name}',
  'home.messageBegin': 'Siap kapan saja — pilih surah untuk mulai.',
  'home.messageRevision': 'Beberapa surah siap untuk diulang kembali.',
  'home.messageOneSurah': 'Terus semangat di {surah} — Anda sedang membangunnya.',
  'home.messageMemorizing': 'Beberapa surah sedang dalam proses — terus lanjutkan.',
  'home.messageCaughtUp': 'Semua sudah rapi. Kerja bagus.',

  'status.new': 'Baru',
  'status.memorizing': 'Sedang dihafal',
  'status.memorized': 'Sudah dihafal',
  'status.revision': 'Perlu diulang',

  'index.title': 'Surah',
  'index.searchPlaceholder': 'Cari berdasarkan nama atau nomor',
  'index.noMatch': 'Surah tidak ditemukan.',
  'index.filterAll': 'Semua',
  'index.select': 'Pilih',
  'index.done': 'Selesai',
  'index.selectedCount': '{n} dipilih',
  'index.markMemorized': 'Tandai sudah dihafal',
  'index.clearSelection': 'Hapus pilihan',

  'detail.translation': 'Terjemahan',
  'detail.arabicOnly': 'Arab saja',
  'detail.loading': 'Memuat…',
  'detail.unable': 'Tidak dapat memuat. Silakan periksa koneksi Anda.',
  'detail.tryAgain': 'Coba lagi',
  'detail.ayahProgress': '{done} dari {total} ayat dihafal',

  'ayahRange.mark': 'Tandai ayat',
  'ayahRange.selectHint': 'Ketuk dua ayat untuk menetapkan rentang.',
  'ayahRange.label': 'Ayat {start}–{end}',
  'ayahRange.labelSingle': 'Ayat {n}',

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
  'dashboard.seeAll': 'Lihat semua {n}',

  'revision.empty': 'Tidak ada yang perlu diulang saat ini.',
  'revision.markConfident': 'Tandai yakin',

  'notes.title': 'Catatan tadabbur',
  'notes.placeholder': 'Apa refleksi Anda saat menghafal surah ini?',

  'tafsir.title': 'Tafsir',
  'tafsir.toggle': 'Tampilkan tafsir',
  'tafsir.loading': 'Memuat tafsir…',
  'tafsir.unable': 'Tidak dapat memuat tafsir. Periksa koneksi Anda dan coba lagi.',

  'options.reading': 'Bacaan',
  'options.practice': 'Latihan',

  'test.mode.off': 'Uji diri: Mati',
  'test.mode.hide': 'Uji diri: Disembunyikan',
  'test.mode.firstWord': 'Uji diri: Kata pertama',
  'test.tapToReveal': 'Ketuk untuk tampilkan',

  'audio.play': 'Putar',
  'audio.pause': 'Jeda',
  'audio.repeat': 'Ulang ×{n}',
  'audio.loopRange': 'Putar ulang rentang',
  'audio.selectRangeHint': 'Ketuk dua ayat untuk menetapkan rentang perulangan.',
  'audio.rangeStart': 'Mulai',
  'audio.rangeEnd': 'Akhir',
  'audio.loopingRange': 'Mengulang ayat {start}–{end}',
  'audio.clearRange': 'Hapus rentang perulangan',

  'settings.title': 'Pengaturan',
  'settings.language': 'Bahasa aplikasi',
  'settings.theme': 'Tema',
  'settings.theme.light': 'Terang',
  'settings.theme.dark': 'Gelap',
  'settings.theme.sepia': 'Sepia',
  'settings.yourName': 'Nama Anda',

  'sync.title': 'Cadangkan & sinkronkan',
  'sync.intro':
    'Opsional. Jaga kemajuan Anda tercadang dan tersinkron antar perangkat — masuk dengan Google, atau gunakan kode sinkronisasi pribadi. Aplikasi berfungsi penuh tanpa ini.',
  'sync.notConnected':
    'Sinkronisasi belum tersambung. Ini aktif setelah layanan disiapkan.',
  'sync.orUseCode': 'atau gunakan kode sinkronisasi',
  'sync.yourCode': 'Kode sinkronisasi Anda',
  'sync.copy': 'Salin',
  'sync.codeHint':
    'Masukkan kode ini di perangkat lain untuk memulihkan kemajuan Anda di sana. Rahasiakan — siapa pun yang memilikinya bisa membaca data Anda.',
  'sync.syncNow': 'Sinkronkan sekarang',
  'sync.stop': 'Hentikan sinkronisasi',
  'sync.createCode': 'Buat kode sinkronisasi',
  'sync.haveCode': 'Sudah punya kode?',
  'sync.restore': 'Pulihkan',
  'sync.created': 'Kode sinkronisasi dibuat. Simpan di tempat yang aman.',
  'sync.restored': 'Dipulihkan dan tersinkron. Kemajuan Anda kini tercadang.',
  'sync.synced': 'Tersinkron.',
  'sync.syncFail': 'Sinkronisasi gagal. Periksa koneksi dan coba lagi.',
  'sync.stopped': 'Perangkat ini tidak lagi tersinkron. Data Anda tetap ada di dalamnya.',
  'sync.copied': 'Kode disalin ke papan klip.',
  'sync.createFail': 'Tidak dapat membuat kode sinkronisasi.',
  'sync.linkFail': 'Tidak dapat menautkan kode itu.',

  'google.synced': 'Tersinkron antar perangkat Anda melalui Google. ✓',
  'google.signOut': 'Keluar',
  'google.hint': 'Masuk sekali di setiap perangkat dan kemajuan Anda tetap tersinkron otomatis.',
  'google.signingIn': 'Sedang masuk…',
  'google.loadFail': 'Tidak dapat memuat masuk dengan Google.',
  'google.signInFail': 'Gagal masuk.',
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
