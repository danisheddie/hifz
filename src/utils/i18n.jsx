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
  'onboarding.syncTitle': 'Keep your progress synced?',
  'onboarding.syncBody':
    'Sign in with Google to back up your progress and keep it in sync across every device you use. Totally optional — you can turn it on anytime later from Settings, and everything works fine without it.',
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

  'juz.title': 'Juz',
  'juz.label': 'Juz {n}',
  'juz.startsAt': 'Starts at {surah} {ayah}',
  'juz.browseLink': 'Browse by Juz',

  'detail.translation': 'Translation',
  'detail.arabicOnly': 'Arabic only',
  'detail.loading': 'Loading…',
  'detail.unable': 'Unable to load. Please check your connection.',
  'detail.tryAgain': 'Try again',
  'detail.ayahProgress': '{done} of {total} ayat memorized',
  'detail.goToAyah': 'Go to ayah',
  'detail.goToAyahPlaceholder': 'Ayah number (1–{n})',
  'detail.go': 'Go',
  'detail.hideOptions': 'Hide',
  'detail.showOptions': 'Show options',
  'detail.ayahPosition': 'Ayah {n} of {total}',
  'detail.previousSurah': 'Previous',
  'detail.nextSurah': 'Next',

  'bookmark.add': 'Bookmark this ayah',
  'bookmark.remove': 'Remove bookmark',
  'bookmarks.empty': 'No bookmarked ayat yet.',

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
  'dashboard.bookmarkedAyat': 'Bookmarked ayat',

  'revision.empty': 'Nothing needs revision right now.',
  'revision.markConfident': 'Mark confident',

  'notes.title': 'Tadabbur notes',
  'notes.placeholder': 'What did you reflect on while memorizing this surah?',

  'tafsir.title': 'Tafsir',
  'tafsir.toggle': 'Show tafsir',
  'tafsir.loading': 'Loading tafsir…',
  'tafsir.unable': 'Couldn’t load tafsir. Check your connection and try again.',

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
  'settings.reciter': 'Reciter',

  'help.title': 'Help & tips',
  'help.intro': 'A quick guide to what you can do in Hifz.',
  'help.section.gettingStarted.title': 'Getting started',
  'help.section.gettingStarted.body':
    'Browse all 114 surahs from the Surahs tab. Tap any surah to open it, read the Arabic and translation, and track your memorization as you go. Your dashboard shows an overview once you’ve started.',
  'help.section.status.title': 'Marking your progress',
  'help.section.status.body':
    'Every surah has a status: New, Memorizing, Memorized, or Needs revision. Tap the buttons at the top of a surah to set it, or use Select on the Surahs list to mark several at once.',
  'help.section.ayahRange.title': 'Marking specific ayat',
  'help.section.ayahRange.body':
    'Only memorized part of a surah? Tap “Mark ayat” inside a surah, then tap the first and last ayah of the range you want — a small menu lets you set its status. Each ayah shows a tiny colored dot for its own progress.',
  'help.section.bookmarks.title': 'Bookmarks & jumping to an ayah',
  'help.section.bookmarks.body':
    'Tap the bookmark icon next to any ayah’s play button to save it — bookmarked ayat show up on your dashboard and the Bookmarks page, one tap away. Inside a surah, tap the search icon in the header to jump straight to an ayah by number.',
  'help.section.audio.title': 'Listening & repeating',
  'help.section.audio.body':
    'Tap the play button on any ayah to hear it recited. “Repeat ×n” controls how many times it repeats. “Loop range” lets you select several ayat to play and repeat together — handy for reviewing a passage.',
  'help.section.testYourself.title': 'Test yourself',
  'help.section.testYourself.body':
    'The “Test yourself” chip hides the Arabic text (or shows just the first word) so you can recall it from memory, then reveal it by tapping. Audio still plays normally, so you can test by listening too.',
  'help.section.notesTafsir.title': 'Notes & tafsir',
  'help.section.notesTafsir.body':
    'Add your own reflections (tadabbur) to any surah in the notes section — they save automatically. Tap “Tafsir” under any ayah for a short explanation of its meaning.',
  'help.section.revision.title': 'Staying on top of revision',
  'help.section.revision.body':
    'Surahs (or ayat) flagged “Needs revision” appear on your dashboard and on the Revision page. Once you’ve reviewed them and feel confident, tap “Mark confident” to clear the flag.',
  'help.section.sync.title': 'Backing up your progress',
  'help.section.sync.body':
    'Turn on Back up & sync in Settings to keep your progress safe and synced across devices, using a sync code or your Google account. Everything still works offline without it.',

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
  'onboarding.syncTitle': 'Segerakkan kemajuan anda?',
  'onboarding.syncBody':
    'Log masuk dengan Google untuk menyandarkan kemajuan anda dan mengekalkannya segerak merentas setiap peranti yang anda gunakan. Sepenuhnya pilihan — anda boleh hidupkannya bila-bila masa kemudian dari Tetapan, dan semuanya berfungsi dengan baik tanpanya.',
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

  'juz.title': 'Juzuk',
  'juz.label': 'Juzuk {n}',
  'juz.startsAt': 'Bermula pada {surah} {ayah}',
  'juz.browseLink': 'Lihat mengikut Juzuk',

  'detail.translation': 'Terjemahan',
  'detail.arabicOnly': 'Arab sahaja',
  'detail.loading': 'Memuatkan…',
  'detail.unable': 'Tidak dapat dimuatkan. Sila semak sambungan anda.',
  'detail.tryAgain': 'Cuba lagi',
  'detail.ayahProgress': '{done} daripada {total} ayat dihafal',
  'detail.goToAyah': 'Pergi ke ayat',
  'detail.goToAyahPlaceholder': 'Nombor ayat (1–{n})',
  'detail.go': 'Pergi',
  'detail.hideOptions': 'Sembunyi',
  'detail.showOptions': 'Tunjuk pilihan',
  'detail.ayahPosition': 'Ayat {n} daripada {total}',
  'detail.previousSurah': 'Sebelum',
  'detail.nextSurah': 'Seterusnya',

  'bookmark.add': 'Tanda buku ayat ini',
  'bookmark.remove': 'Buang tanda buku',
  'bookmarks.empty': 'Belum ada ayat ditanda buku.',

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
  'dashboard.bookmarkedAyat': 'Ayat ditanda buku',

  'revision.empty': 'Tiada apa yang perlu diulang kaji sekarang.',
  'revision.markConfident': 'Tandakan yakin',

  'notes.title': 'Nota tadabbur',
  'notes.placeholder': 'Apakah renungan anda semasa menghafal surah ini?',

  'tafsir.title': 'Tafsir',
  'tafsir.toggle': 'Tunjuk tafsir',
  'tafsir.loading': 'Memuatkan tafsir…',
  'tafsir.unable': 'Tidak dapat memuatkan tafsir. Semak sambungan anda dan cuba lagi.',

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
  'settings.reciter': 'Qari',

  'help.title': 'Bantuan & petua',
  'help.intro': 'Panduan ringkas tentang apa yang boleh anda lakukan dalam Hifz.',
  'help.section.gettingStarted.title': 'Bermula',
  'help.section.gettingStarted.body':
    'Layari kesemua 114 surah dari tab Surah. Ketik mana-mana surah untuk membukanya, baca teks Arab dan terjemahan, serta jejak hafazan anda semasa anda maju. Papan pemuka anda memaparkan gambaran keseluruhan sebaik sahaja anda bermula.',
  'help.section.status.title': 'Menandakan kemajuan anda',
  'help.section.status.body':
    'Setiap surah mempunyai status: Baharu, Sedang dihafal, Sudah dihafal, atau Perlu diulang kaji. Ketik butang di bahagian atas sesuatu surah untuk menetapkannya, atau guna Pilih pada senarai Surah untuk menandakan beberapa surah sekali gus.',
  'help.section.ayahRange.title': 'Menandakan ayat tertentu',
  'help.section.ayahRange.body':
    'Hanya menghafal sebahagian daripada surah? Ketik “Tandakan ayat” dalam surah, kemudian ketik ayat pertama dan terakhir bagi julat yang anda mahu — menu kecil membolehkan anda menetapkan statusnya. Setiap ayat memaparkan titik warna kecil untuk kemajuannya sendiri.',
  'help.section.bookmarks.title': 'Tanda buku & melompat ke ayat',
  'help.section.bookmarks.body':
    'Ketik ikon tanda buku di sebelah butang main mana-mana ayat untuk menyimpannya — ayat yang ditanda buku dipaparkan pada papan pemuka anda dan halaman Tanda Buku, sejauh satu ketikan. Di dalam surah, ketik ikon carian pada pengepala untuk terus melompat ke sesuatu ayat mengikut nombor.',
  'help.section.audio.title': 'Mendengar & mengulang',
  'help.section.audio.body':
    'Ketik butang main pada mana-mana ayat untuk mendengarnya dibacakan. “Ulang ×n” mengawal berapa kali ia diulang. “Gelung julat” membolehkan anda memilih beberapa ayat untuk dimainkan dan diulang bersama — berguna untuk mengkaji semula satu petikan.',
  'help.section.testYourself.title': 'Uji diri anda',
  'help.section.testYourself.body':
    'Cip “Uji diri” menyembunyikan teks Arab (atau memaparkan hanya perkataan pertama) supaya anda boleh mengingatinya dari memori, kemudian dedahkannya dengan mengetik. Audio masih dimainkan seperti biasa, jadi anda boleh menguji dengan mendengar juga.',
  'help.section.notesTafsir.title': 'Nota & tafsir',
  'help.section.notesTafsir.body':
    'Tambah renungan (tadabbur) anda sendiri pada mana-mana surah dalam bahagian nota — ia disimpan secara automatik. Ketik “Tafsir” di bawah mana-mana ayat untuk penjelasan ringkas tentang maksudnya.',
  'help.section.revision.title': 'Kekal mengulang kaji',
  'help.section.revision.body':
    'Surah (atau ayat) yang ditandakan “Perlu diulang kaji” akan dipaparkan pada papan pemuka anda dan di halaman Ulang kaji. Setelah anda mengulang kajinya dan berasa yakin, ketik “Tandakan yakin” untuk mengosongkan tanda tersebut.',
  'help.section.sync.title': 'Menyandarkan kemajuan anda',
  'help.section.sync.body':
    'Hidupkan Sandaran & penyegerakan dalam Tetapan untuk memastikan kemajuan anda selamat dan segerak merentas peranti, menggunakan kod penyegerakan atau akaun Google anda. Semuanya masih berfungsi luar talian tanpanya.',

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
  'onboarding.syncTitle': 'Sinkronkan kemajuan Anda?',
  'onboarding.syncBody':
    'Masuk dengan Google untuk mencadangkan kemajuan Anda dan menjaganya tetap tersinkron di setiap perangkat yang Anda gunakan. Sepenuhnya opsional — Anda bisa mengaktifkannya kapan saja nanti dari Pengaturan, dan semuanya tetap berfungsi baik tanpanya.',
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

  'juz.title': 'Juz',
  'juz.label': 'Juz {n}',
  'juz.startsAt': 'Dimulai di {surah} {ayah}',
  'juz.browseLink': 'Jelajahi berdasarkan Juz',

  'detail.translation': 'Terjemahan',
  'detail.arabicOnly': 'Arab saja',
  'detail.loading': 'Memuat…',
  'detail.unable': 'Tidak dapat memuat. Silakan periksa koneksi Anda.',
  'detail.tryAgain': 'Coba lagi',
  'detail.ayahProgress': '{done} dari {total} ayat dihafal',
  'detail.goToAyah': 'Ke ayat',
  'detail.goToAyahPlaceholder': 'Nomor ayat (1–{n})',
  'detail.go': 'Pergi',
  'detail.hideOptions': 'Sembunyikan',
  'detail.showOptions': 'Tampilkan opsi',
  'detail.ayahPosition': 'Ayat {n} dari {total}',
  'detail.previousSurah': 'Sebelumnya',
  'detail.nextSurah': 'Berikutnya',

  'bookmark.add': 'Bookmark ayat ini',
  'bookmark.remove': 'Hapus bookmark',
  'bookmarks.empty': 'Belum ada ayat yang di-bookmark.',

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
  'dashboard.bookmarkedAyat': 'Ayat yang di-bookmark',

  'revision.empty': 'Tidak ada yang perlu diulang saat ini.',
  'revision.markConfident': 'Tandai yakin',

  'notes.title': 'Catatan tadabbur',
  'notes.placeholder': 'Apa refleksi Anda saat menghafal surah ini?',

  'tafsir.title': 'Tafsir',
  'tafsir.toggle': 'Tampilkan tafsir',
  'tafsir.loading': 'Memuat tafsir…',
  'tafsir.unable': 'Tidak dapat memuat tafsir. Periksa koneksi Anda dan coba lagi.',

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
  'settings.reciter': 'Qari',

  'help.title': 'Bantuan & tips',
  'help.intro': 'Panduan singkat tentang apa yang bisa Anda lakukan di Hifz.',
  'help.section.gettingStarted.title': 'Memulai',
  'help.section.gettingStarted.body':
    'Jelajahi semua 114 surah dari tab Surah. Ketuk surah mana pun untuk membukanya, baca teks Arab dan terjemahan, serta lacak hafalan Anda seiring waktu. Dasbor Anda akan menampilkan ringkasan begitu Anda mulai.',
  'help.section.status.title': 'Menandai kemajuan Anda',
  'help.section.status.body':
    'Setiap surah memiliki status: Baru, Sedang dihafal, Sudah dihafal, atau Perlu diulang. Ketuk tombol di bagian atas surah untuk menetapkannya, atau gunakan Pilih pada daftar Surah untuk menandai beberapa surah sekaligus.',
  'help.section.ayahRange.title': 'Menandai ayat tertentu',
  'help.section.ayahRange.body':
    'Hanya menghafal sebagian dari surah? Ketuk “Tandai ayat” di dalam surah, lalu ketuk ayat pertama dan terakhir dari rentang yang Anda inginkan — menu kecil memungkinkan Anda menetapkan statusnya. Setiap ayat menampilkan titik warna kecil untuk kemajuannya sendiri.',
  'help.section.bookmarks.title': 'Bookmark & lompat ke ayat',
  'help.section.bookmarks.body':
    'Ketuk ikon bookmark di sebelah tombol putar ayat mana pun untuk menyimpannya — ayat yang di-bookmark muncul di dasbor Anda dan halaman Bookmark, hanya satu ketukan. Di dalam surah, ketuk ikon pencarian di header untuk langsung melompat ke ayat tertentu berdasarkan nomornya.',
  'help.section.audio.title': 'Mendengarkan & mengulang',
  'help.section.audio.body':
    'Ketuk tombol putar pada ayat mana pun untuk mendengarkannya dibacakan. “Ulang ×n” mengatur berapa kali diulang. “Putar ulang rentang” memungkinkan Anda memilih beberapa ayat untuk diputar dan diulang bersama — berguna untuk mengulas satu bagian.',
  'help.section.testYourself.title': 'Uji diri Anda',
  'help.section.testYourself.body':
    'Chip “Uji diri” menyembunyikan teks Arab (atau hanya menampilkan kata pertama) sehingga Anda bisa mengingatnya dari hafalan, lalu tampilkan dengan mengetuk. Audio tetap diputar seperti biasa, jadi Anda juga bisa menguji dengan mendengarkan.',
  'help.section.notesTafsir.title': 'Catatan & tafsir',
  'help.section.notesTafsir.body':
    'Tambahkan refleksi (tadabbur) Anda sendiri pada surah mana pun di bagian catatan — tersimpan otomatis. Ketuk “Tafsir” di bawah ayat mana pun untuk penjelasan singkat maknanya.',
  'help.section.revision.title': 'Tetap mengulang',
  'help.section.revision.body':
    'Surah (atau ayat) yang ditandai “Perlu diulang” akan muncul di dasbor Anda dan di halaman Ulang. Setelah Anda mengulasnya dan merasa yakin, ketuk “Tandai yakin” untuk menghapus tandanya.',
  'help.section.sync.title': 'Mencadangkan kemajuan Anda',
  'help.section.sync.body':
    'Aktifkan Cadangkan & sinkronkan di Pengaturan untuk menjaga kemajuan Anda tetap aman dan tersinkron di berbagai perangkat, menggunakan kode sinkronisasi atau akun Google Anda. Semuanya tetap berfungsi offline tanpa ini.',

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
