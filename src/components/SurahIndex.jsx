// All 114 surahs, searchable by name or number. Tapping one opens SurahDetail.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listSurahs } from '../utils/api'
import { useLang } from '../utils/i18n.jsx'

export default function SurahIndex() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [surahs, setSurahs] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    listSurahs().then(setSurahs)
  }, [])

  const filtered = useMemo(() => {
    if (!surahs) return []
    const q = query.trim().toLowerCase()
    if (!q) return surahs
    return surahs.filter(
      (s) =>
        s.englishName.toLowerCase().includes(q) ||
        s.name.includes(query.trim()) ||
        String(s.number) === q
    )
  }, [surahs, query])

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/')}
            aria-label={t('common.back')}
            className="rounded-full p-1.5 text-muted transition active:scale-90"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-emerald">{t('index.title')}</h1>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('index.searchPlaceholder')}
          className="mt-3 w-full rounded-xl border border-emerald/15 bg-transparent px-4 py-2.5 text-sm text-emerald placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald/20"
        />
      </header>

      <main className="px-3 pb-10 pt-2">
        {surahs === null && (
          <div className="flex flex-col items-center gap-4 py-24 text-muted">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald/20 border-t-emerald" />
          </div>
        )}

        {surahs !== null && filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-muted">{t('index.noMatch')}</p>
        )}

        <ul>
          {filtered.map((s) => (
            <li key={s.number}>
              <Link
                to={`/surah/${s.number}`}
                className="flex items-center gap-4 rounded-xl px-3 py-3.5 transition active:scale-[0.99] active:bg-emerald/5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald/15 text-xs font-semibold text-emerald">
                  {s.number}
                </span>
                <span className="min-w-0 grow">
                  <span className="block truncate text-[15px] font-medium text-emerald">
                    {s.englishName}
                  </span>
                  <span className="block text-xs text-muted">
                    {s.ayahCount} {s.ayahCount === 1 ? t('common.ayah') : t('common.ayahs')}
                  </span>
                </span>
                <span className="font-quran shrink-0 text-xl text-emerald" dir="rtl" lang="ar">
                  {s.name}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
