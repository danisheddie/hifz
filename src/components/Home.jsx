// Dashboard: a personal greeting, overall progress, a shortcut to what's
// currently being memorized, and a due-for-revision list. Shows a simple
// welcome instead when there's nothing tracked yet.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSurahs } from '../utils/api'
import { getSurahStatusMap, getName, hasRevisionRanges } from '../utils/storage'
import { computeProgress } from '../utils/progress'
import { daysAgo, formatLastRevised } from '../utils/dateUtils'
import { useLang } from '../utils/i18n.jsx'
import StatusBadge from './StatusBadge'

// Keep the dashboard preview short — the full, sortable list lives at
// /revision so this section never grows to dominate the home screen.
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

  useEffect(() => {
    const statusMap = getSurahStatusMap()
    computeProgress().then(setProgress)
    listSurahs().then((surahs) => {
      const withEntry = surahs.map((s) => ({ ...s, entry: statusMap[s.number] }))
      setMemorizing(withEntry.filter((s) => s.entry?.status === 'memorizing'))
      setRevision(
        withEntry
          .filter((s) => hasRevisionRanges(s.entry))
          .sort((a, b) => daysAgo(b.entry?.lastRevised) - daysAgo(a.entry?.lastRevised))
      )
    })
  }, [])

  const hasProgress = progress && (progress.surahsMemorized > 0 || memorizing.length > 0)
  const greeting = name ? t('home.greetingName', { name }) : t('home.greeting')
  const message = greetingMessage(t, { hasProgress, revisionCount: revision.length, memorizing })

  if (!hasProgress) {
    return (
      <div className="relative mx-auto flex h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <div className="absolute right-5 top-5 flex items-center gap-1">
          <HelpLink t={t} />
          <SettingsLink t={t} />
        </div>
        <p className="font-quran text-3xl leading-loose text-emerald sm:text-4xl" dir="rtl" lang="ar">
          حِفْظ
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-emerald">{greeting}</h1>
        <p className="mt-2 max-w-xs text-sm text-muted">{message}</p>
        <Link to="/surahs" className="btn-primary mt-10">
          {t('home.browseSurahs')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto px-6 pb-16 pt-10">
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

      {progress && (
        <>
          <section className="mt-8 rounded-2xl border border-emerald/10 p-5">
            <p className="text-4xl font-semibold text-emerald">{progress.percent}%</p>
            <p className="text-sm text-muted">{t('dashboard.memorized')}</p>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-emerald/10">
              <div
                className="h-full rounded-full bg-emerald transition-all"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
            <div className="mt-4 flex gap-4 text-xs text-muted">
              <span>{t('dashboard.juz', { n: progress.juzCompleted })}</span>
              <span>{t('dashboard.surahs', { n: progress.surahsMemorized })}</span>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="text-sm font-semibold text-emerald">
              {t('dashboard.currentlyMemorizing')}
            </h2>
            {memorizing.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t('dashboard.emptyMemorizing')}</p>
            ) : (
              <ul className="mt-3 flex flex-col gap-2">
                {memorizing.map((s) => (
                  <li key={s.number}>
                    <Link
                      to={`/surah/${s.number}`}
                      className="flex items-center justify-between rounded-xl border border-amber/20 bg-amber/5 px-4 py-3 transition active:scale-[0.99]"
                    >
                      <span className="text-[15px] font-medium text-emerald">
                        {s.englishName}
                      </span>
                      <span className="font-quran text-lg text-emerald" dir="rtl" lang="ar">
                        {s.name}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {revision.length > 0 && (
            <section className="mt-8">
              <Link to="/revision" className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-emerald">
                  {t('dashboard.dueForRevision')}
                </h2>
                {revision.length > REVISION_PREVIEW_LIMIT && (
                  <span className="text-xs font-medium text-muted">
                    {t('dashboard.seeAll', { n: revision.length })}
                  </span>
                )}
              </Link>
              <ul className="mt-3 flex flex-col gap-2">
                {revision.slice(0, REVISION_PREVIEW_LIMIT).map((s) => (
                  <li key={s.number}>
                    <Link
                      to={`/surah/${s.number}`}
                      className="flex items-center justify-between gap-3 rounded-xl border border-clay/20 bg-clay/5 px-4 py-3 transition active:scale-[0.99]"
                    >
                      <span>
                        <span className="block text-[15px] font-medium text-emerald">
                          {s.englishName}
                        </span>
                        <span className="block text-xs text-muted">
                          {formatLastRevised(t, s.entry?.lastRevised)}
                        </span>
                      </span>
                      <StatusBadge status="revision" />
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <Link to="/surahs" className="btn-ghost mt-10 w-full">
            {t('home.browseSurahs')}
          </Link>
        </>
      )}
    </div>
  )
}
