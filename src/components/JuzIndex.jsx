// All 30 Juz with % complete (ayah-accurate, via progress.js), each row
// jumping straight to where that Juz begins. A Juz often spans parts of two
// or more surahs, so "start reading here" — reusing the existing ayah
// deep-link (?ayah=N) — is the useful action, not a filtered surah list.

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getJuzStarts, SURAH_NAMES } from '../utils/api'
import { computeJuzProgress } from '../utils/progress'
import { useLang } from '../utils/i18n.jsx'
import BackButton from './BackButton'
import LoadingSpinner from './LoadingSpinner'

export default function JuzIndex() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)

  useEffect(() => {
    Promise.all([computeJuzProgress(), getJuzStarts()]).then(([progress, starts]) => {
      setRows(progress.map((p) => ({ ...p, start: starts[p.juz] })))
    })
  }, [])

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <BackButton onClick={() => navigate('/surahs')} />
        <h1 className="text-lg font-semibold text-emerald">{t('juz.title')}</h1>
      </header>

      <main className="px-3 pb-10 pt-2">
        {rows === null && <LoadingSpinner />}

        {rows !== null && (
          <ul className="flex flex-col gap-2 px-2 py-2">
            {rows.map((r) => (
              <li key={r.juz}>
                <button
                  type="button"
                  onClick={() => r.start && navigate(`/surah/${r.start.surah}?ayah=${r.start.ayah}`)}
                  disabled={!r.start}
                  className="flex w-full flex-col gap-2 rounded-xl border border-emerald/10 px-4 py-3 text-left transition active:scale-[0.99] disabled:opacity-50"
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald/8 text-xs font-semibold text-emerald">
                        {r.juz}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[15px] font-medium text-emerald">
                          {t('juz.label', { n: r.juz })}
                        </span>
                        {r.start && (
                          <span className="block truncate text-xs text-muted">
                            {t('juz.startsAt', {
                              surah: SURAH_NAMES[r.start.surah - 1],
                              ayah: r.start.ayah,
                            })}
                          </span>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-emerald">{r.percent}%</span>
                  </span>
                  <span className="block h-1 overflow-hidden rounded-full bg-emerald/10">
                    <span
                      className="block h-full rounded-full bg-emerald transition-all"
                      style={{ width: `${r.percent}%` }}
                    />
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
