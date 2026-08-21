// Dashboard: a personal greeting, overall progress, a "continue" shortcut to
// wherever reading last left off, and a due-for-revision list. Shows a
// simple welcome instead when there's nothing tracked yet.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSurahs } from '../utils/api'
import { getSurahStatusMap, getName, hasRevisionRanges, getBookmarks, getLastRead } from '../utils/storage'
import { computeProgress } from '../utils/progress'
import { daysAgo, formatLastRevised } from '../utils/dateUtils'
import { useLang } from '../utils/i18n.jsx'
import InstallPrompt from './InstallPrompt'
import BottomNav from './BottomNav'

// Keep the dashboard preview short — the full, sortable list lives at
// /revision (or /bookmarks, or the filtered Surah Index) so these sections
// never grow to dominate the home screen.
const REVISION_PREVIEW_LIMIT = 3

function SettingsLink({ t, className = '' }) {
  return (
    <Link
      to="/settings"
      aria-label={t('settings.title')}
      className={`rounded-full p-1.5 text-muted transition active:scale-90 ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    </Link>
  )
}

function HelpLink({ t, className = '' }) {
  return (
    <Link
      to="/help"
      aria-label={t('help.title')}
      className={`rounded-full p-1.5 text-muted transition active:scale-90 ${className}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path d="M9.5 9a2.5 2.5 0 0 1 4.9.75c0 1.65-2.4 2-2.4 3.5" />
        <circle cx="12" cy="17" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </Link>
  )
}

// A warm, unhurried message reflecting where things stand right now — never
// a nudge about time elapsed or a count of what's "overdue".
function greetingMessage(t, { hasProgress, revisionCount, memorizing }) {
  if (!hasProgress) return t('home.messageBegin')
  if (revisionCount > 0) return t('home.messageRevision')
  if (memorizing.length === 1) return t('home.messageOneSurah', { surah: memorizing[0].englishName })
  if (memorizing.length > 1) return t('home.messageMemorizing')
  return t('home.messageCaughtUp')
}

export default function Home() {
  const { t } = useLang()
  const name = getName()
  const [progress, setProgress] = useState(null)
  const [memorizing, setMemorizing] = useState([])
  const [revision, setRevision] = useState([])
  const [bookmarks, setBookmarks] = useState([])
  const [continueItem, setContinueItem] = useState(null)

  useEffect(() => {
    const statusMap = getSurahStatusMap()
    computeProgress().then(setProgress)
    listSurahs().then((surahs) => {
      const withEntry = surahs.map((s) => ({ ...s, entry: statusMap[s.number] }))
      const memorizingList = withEntry.filter((s) => s.entry?.status === 'memorizing')
      setMemorizing(memorizingList)
      setRevision(
        withEntry
          .filter((s) => hasRevisionRanges(s.entry))
          .sort((a, b) => daysAgo(b.entry?.lastRevised) - daysAgo(a.entry?.lastRevised))
      )
      const bySurah = new Map(surahs.map((s) => [s.number, s]))
      setBookmarks(
        getBookmarks()
          .map((b) => ({ ...b, surahInfo: bySurah.get(b.surah) }))
          .filter((b) => b.surahInfo)
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      )

      // "Continue" prefers an actual reading position; falls back to
      // whatever's in progress if reading hasn't started yet (e.g. surahs
      // marked via onboarding's quick-start or bulk-select, never opened).
      const lastRead = getLastRead()
      if (lastRead && bySurah.has(lastRead.surah)) {
        setContinueItem({ surah: bySurah.get(lastRead.surah), ayah: lastRead.ayah })
      } else if (memorizingList.length > 0) {
        setContinueItem({ surah: memorizingList[0], ayah: null })
      } else {
        setContinueItem(null)
      }
    })
  }, [])

  const hasProgress =
    progress && (progress.surahsMemorized > 0 || memorizing.length > 0 || bookmarks.length > 0)
  const greeting = name ? t('home.greetingName', { name }) : t('home.greeting')
  const message = greetingMessage(t, { hasProgress, revisionCount: revision.length, memorizing })
  const latestBookmark = bookmarks[0]

  if (!hasProgress) {
    return (
      <div className="mx-auto flex h-screen max-w-2xl flex-col">
        <div className="relative flex flex-1 flex-col items-center px-6 pt-28 text-center">
          <div className="absolute right-5 top-5 flex items-center gap-1">
            <HelpLink t={t} />
            <SettingsLink t={t} />
          </div>
          <p className="font-quran text-3xl leading-loose text-emerald sm:text-4xl" dir="rtl" lang="ar">
            حِفْظ
          </p>
          <h1 className="mt-4 text-2xl font-semibold text-emerald">{greeting}</h1>
          <p className="mt-2 max-w-xs text-sm text-muted">{message}</p>
          <div className="w-full max-w-xs">
            <InstallPrompt />
          </div>
          <Link to="/surahs" className="btn-primary mt-10">
            {t('home.browseSurahs')}
          </Link>
        </div>
        <BottomNav />
      </div>
    )
  }

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col">
      <div className="flex-1 overflow-y-auto px-6 pb-6 pt-10">
        <div className="flex items-start justify-between">
          <p className="font-quran text-2xl leading-none text-emerald" dir="rtl" lang="ar">
            حِفْظ
          </p>
          <div className="flex items-center gap-1">
            <HelpLink t={t} />
            <SettingsLink t={t} />
          </div>
        </div>
        <h1 className="mt-3 text-2xl font-semibold text-emerald">{greeting}</h1>
        <p className="mt-1 text-sm text-muted">{message}</p>
        <InstallPrompt />

        {progress && (
          <>
            <section className="mt-8 rounded-2xl border border-emerald/10 p-5">
              <p className="flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold text-emerald">{progress.percent}%</span>
                <span className="text-sm text-muted">{t('dashboard.memorized')}</span>
              </p>
              <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-emerald/10">
                <div
                  className="h-full rounded-full bg-emerald transition-all"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="mt-3 text-xs text-muted">
                {t('dashboard.surahs', { n: progress.surahsMemorized })}
                {' · '}
                {t('dashboard.juz', { n: progress.juzCompleted })}
              </p>
            </section>

            {continueItem && (
              <section className="mt-8">
                <Link
                  to={
                    continueItem.ayah
                      ? `/surah/${continueItem.surah.number}?ayah=${continueItem.ayah}`
                      : `/surah/${continueItem.surah.number}`
                  }
                  className="flex items-center gap-3 rounded-2xl border border-amber/20 bg-amber/5 px-4 py-3.5 transition active:scale-[0.99]"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <path d="M12 6.5c-2-1.4-5-1.8-8-1v13c3-.8 6-.4 8 1 2-1.4 5-1.8 8-1v-13c-3-.8-6-.4-8 1Z" />
                      <path d="M12 6.5v13" />
                    </svg>
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-amber">
                      {t('home.continueReading')}
                    </span>
                    <span className="block truncate text-[15px] font-medium text-emerald">
                      {continueItem.surah.englishName}
                    </span>
                    {continueItem.ayah && (
                      <span className="block text-xs text-muted">
                        {t('detail.ayahPosition', { n: continueItem.ayah, total: continueItem.surah.ayahCount })}
                      </span>
                    )}
                  </span>
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber text-paper">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </section>
            )}

            {revision.length > 0 && (
              <section className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-emerald">
                    {t('dashboard.dueForRevision')}
                  </h2>
                  <span className="rounded-full bg-clay/10 px-2.5 py-0.5 text-xs font-medium text-clay">
                    {t('dashboard.due', { n: revision.length })}
                  </span>
                </div>
                <ul className="mt-3 flex flex-col gap-2">
                  {revision.slice(0, REVISION_PREVIEW_LIMIT).map((s) => (
                    <li key={s.number}>
                      <Link
                        to={`/surah/${s.number}`}
                        className="flex items-center gap-3 rounded-xl border border-clay/20 bg-clay/5 px-4 py-3 transition active:scale-[0.99]"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-clay/15 text-xs font-semibold text-clay">
                          {s.number}
                        </span>
                        <span className="min-w-0 grow">
                          <span className="block truncate text-[15px] font-medium text-emerald">
                            {s.englishName}
                          </span>
                          <span className="block text-xs text-muted">
                            {formatLastRevised(t, s.entry?.lastRevised)}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-medium text-clay">{t('revision.revise')} →</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {revision.length > REVISION_PREVIEW_LIMIT && (
                  <Link
                    to="/revision"
                    className="mt-2 flex items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-medium text-clay transition active:scale-[0.99]"
                  >
                    {t('dashboard.viewAll', { n: revision.length })} →
                  </Link>
                )}
              </section>
            )}

            {latestBookmark && (
              <section className="mt-8">
                <h2 className="text-sm font-semibold text-emerald">{t('dashboard.bookmark')}</h2>
                <Link
                  to={`/surah/${latestBookmark.surah}?ayah=${latestBookmark.ayah}`}
                  className="mt-3 flex items-center gap-3 rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 transition active:scale-[0.99]"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/15 text-amber">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                      <path d="M6 3a1 1 0 0 0-1 1v17l7-4 7 4V4a1 1 0 0 0-1-1H6Z" />
                    </svg>
                  </span>
                  <span className="min-w-0 grow">
                    <span className="block truncate text-[15px] font-medium text-emerald">
                      {latestBookmark.surahInfo.englishName}
                    </span>
                    <span className="block text-xs text-muted">
                      {t('ayahRange.labelSingle', { n: latestBookmark.ayah })}
                    </span>
                  </span>
                  <span className="shrink-0 text-muted">→</span>
                </Link>
              </section>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
