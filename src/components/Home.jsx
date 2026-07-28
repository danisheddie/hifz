// Dashboard: overall progress, a shortcut to what's currently being
// memorized, and a due-for-revision list. Shows a simple welcome instead
// when there's nothing tracked yet.

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { listSurahs } from '../utils/api'
import { getSurahStatusMap } from '../utils/storage'
import { computeProgress } from '../utils/progress'
import { daysAgo } from '../utils/dateUtils'
import { useLang } from '../utils/i18n.jsx'
import StatusBadge from './StatusBadge'

function lastRevisedLabel(t, lastRevised) {
  if (!lastRevised) return t('dashboard.lastRevisedNever')
  const n = daysAgo(lastRevised)
  if (n <= 0) return t('dashboard.lastRevisedToday')
  if (n === 1) return t('dashboard.lastRevisedYesterday')
  return t('dashboard.lastRevisedDaysAgo', { n })
}

export default function Home() {
  const { t } = useLang()
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
          .filter((s) => s.entry?.status === 'revision')
          .sort((a, b) => daysAgo(b.entry?.lastRevised) - daysAgo(a.entry?.lastRevised))
      )
    })
  }, [])

  const hasProgress = progress && (progress.surahsMemorized > 0 || memorizing.length > 0)

  if (!hasProgress) {
    return (
      <div className="mx-auto flex h-screen max-w-2xl flex-col items-center justify-center px-6 text-center">
        <p className="font-quran text-4xl leading-loose text-emerald sm:text-5xl" dir="rtl" lang="ar">
          حِفْظ
        </p>
        <h1 className="mt-4 text-2xl font-semibold text-emerald">{t('common.appName')}</h1>
        <p className="mt-2 max-w-xs text-sm text-muted">{t('home.subtitle')}</p>
        <Link to="/surahs" className="btn-primary mt-10">
          {t('home.browseSurahs')}
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto px-6 pb-16 pt-10">
      <p className="font-quran text-3xl leading-none text-emerald" dir="rtl" lang="ar">
        حِفْظ
      </p>
      <h1 className="mt-2 text-xl font-semibold text-emerald">{t('common.appName')}</h1>

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
              <h2 className="text-sm font-semibold text-emerald">
                {t('dashboard.dueForRevision')}
              </h2>
              <ul className="mt-3 flex flex-col gap-2">
                {revision.map((s) => (
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
                          {lastRevisedLabel(t, s.entry?.lastRevised)}
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
