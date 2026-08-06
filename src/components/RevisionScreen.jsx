// All surahs flagged "needs revision", ordered by longest since last
// revised. "Mark confident" clears the flag (back to 'memorized', which also
// resets lastRevised) right from the list — no need to open the surah first.

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listSurahs } from '../utils/api'
import { getSurahStatusMap, markRevisionConfident, hasRevisionRanges } from '../utils/storage'
import { schedulePush } from '../utils/cloudSync'
import { daysAgo, formatLastRevised } from '../utils/dateUtils'
import { useLang } from '../utils/i18n.jsx'
import BackButton from './BackButton'
import LoadingSpinner from './LoadingSpinner'
import EmptyState from './EmptyState'

export default function RevisionScreen() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [surahs, setSurahs] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    const statusMap = getSurahStatusMap()
    listSurahs().then((list) => {
      const due = list
        .map((s) => ({ ...s, entry: statusMap[s.number] }))
        .filter((s) => hasRevisionRanges(s.entry))
        .sort((a, b) => daysAgo(b.entry?.lastRevised) - daysAgo(a.entry?.lastRevised))
      setSurahs(due)
    })
  }

  // Promotes only the ayahs actually flagged for revision — a surah that's
  // still partly `memorizing` elsewhere doesn't get silently marked done.
  function markConfident(s) {
    markRevisionConfident(s.number, s.ayahCount)
    setSurahs((list) => list.filter((x) => x.number !== s.number))
    schedulePush()
  }

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <BackButton onClick={() => navigate('/')} />
        <h1 className="text-lg font-semibold text-emerald">{t('dashboard.dueForRevision')}</h1>
      </header>

      <main className="px-3 pb-10 pt-2">
        {surahs === null && <LoadingSpinner />}

        {surahs !== null && surahs.length === 0 && (
          <EmptyState
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="m8 12 3 3 5-6" />
              </svg>
            }
            message={t('revision.empty')}
            actionLabel={t('home.browseSurahs')}
            actionTo="/surahs"
          />
        )}

        <ul className="flex flex-col gap-2 px-2 py-2">
          {surahs?.map((s) => (
            <li key={s.number}>
              <div className="flex items-center gap-3 rounded-xl border border-clay/20 bg-clay/5 px-4 py-3">
                <Link to={`/surah/${s.number}`} className="min-w-0 grow">
                  <span className="block text-[15px] font-medium text-emerald">
                    {s.englishName}
                  </span>
                  <span className="block text-xs text-muted">
                    {formatLastRevised(t, s.entry?.lastRevised)}
                  </span>
                </Link>
                <span className="font-quran shrink-0 text-lg text-emerald" dir="rtl" lang="ar">
                  {s.name}
                </span>
                <button
                  type="button"
                  onClick={() => markConfident(s)}
                  className="shrink-0 rounded-full bg-emerald/10 px-3 py-1.5 text-xs font-medium text-emerald transition active:scale-95"
                >
                  {t('revision.markConfident')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
