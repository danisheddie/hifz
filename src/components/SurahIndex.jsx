// All 114 surahs, searchable by name/number and filterable by memorization
// status. Tapping one opens SurahDetail.

import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { listSurahs } from '../utils/api'
import { STATUSES, getSurahStatusMap, setSurahStatus } from '../utils/storage'
import { schedulePush } from '../utils/cloudSync'
import { STATUS_RING } from '../utils/statusStyle'
import { useLang } from '../utils/i18n.jsx'
import BackButton from './BackButton'
import LoadingSpinner from './LoadingSpinner'
import StatusBadge from './StatusBadge'

const FILTERS = ['all', ...STATUSES]

export default function SurahIndex() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [surahs, setSurahs] = useState(null)
  const [query, setQuery] = useState('')
  // Pre-selects the filter chip when arriving via a "see all" link (e.g. the
  // dashboard's Currently Memorizing section) — /surahs?status=memorizing.
  const [filter, setFilter] = useState(() => {
    const s = searchParams.get('status')
    return FILTERS.includes(s) ? s : 'all'
  })
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

  useEffect(() => {
    const statusMap = getSurahStatusMap()
    listSurahs().then((list) => {
      setSurahs(list.map((s) => ({ ...s, status: statusMap[s.number]?.status || 'new' })))
    })
  }, [])

  function toggleSelectMode() {
    setSelectMode((prev) => !prev)
    setSelected(new Set())
  }

  function toggleSelected(number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(number)) next.delete(number)
      else next.add(number)
      return next
    })
  }

  function applySelectedStatus(status) {
    for (const number of selected) setSurahStatus(number, status)
    schedulePush()
    setSurahs((prev) => prev.map((s) => (selected.has(s.number) ? { ...s, status } : s)))
    setSelected(new Set())
    setSelectMode(false)
  }

  const filtered = useMemo(() => {
    if (!surahs) return []
    const q = query.trim().toLowerCase()
    return surahs.filter((s) => {
      if (filter !== 'all' && s.status !== filter) return false
      if (!q) return true
      return (
        s.englishName.toLowerCase().includes(q) ||
        s.name.includes(query.trim()) ||
        String(s.number) === q
      )
    })
  }, [surahs, query, filter])

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <div className="flex items-center gap-2">
          <BackButton onClick={() => navigate('/')} />
          <h1 className="grow text-lg font-semibold text-emerald">{t('index.title')}</h1>
          <button
            type="button"
            onClick={toggleSelectMode}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
              selectMode ? 'bg-emerald text-paper' : 'bg-emerald/5 text-muted'
            }`}
          >
            {selectMode ? t('index.done') : t('index.select')}
          </button>
        </div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('index.searchPlaceholder')}
          className="mt-3 w-full rounded-xl border border-emerald/15 bg-transparent px-4 py-2.5 text-sm text-emerald placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald/20"
        />
        <div className="relative mt-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition active:scale-95 ${
                  filter === f
                    ? 'bg-emerald text-paper'
                    : 'bg-emerald/5 text-muted'
                }`}
              >
                {f === 'all' ? t('index.filterAll') : t(`status.${f}`)}
              </button>
            ))}
          </div>
          {/* Signals there's more to scroll to — the row was clipping the
              last chip mid-word with nothing hinting it was scrollable. */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper to-transparent"
            aria-hidden="true"
          />
        </div>
        <button
          type="button"
          onClick={() => navigate('/juz')}
          className="mt-2.5 text-xs font-medium text-muted underline decoration-emerald/25 underline-offset-2"
        >
          {t('juz.browseLink')}
        </button>
      </header>

      <main className={`px-3 pt-2 ${selected.size > 0 ? 'pb-24' : 'pb-10'}`}>
        {surahs === null && <LoadingSpinner />}

        {surahs !== null && filtered.length === 0 && (
          <p className="py-16 text-center text-sm text-muted">{t('index.noMatch')}</p>
        )}

        <ul>
          {filtered.map((s) => {
            const isSelected = selected.has(s.number)
            const row = (
              <span className="flex items-center gap-3">
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition ${
                    selectMode
                      ? isSelected
                        ? 'border-emerald bg-emerald text-paper'
                        : 'border-emerald/15 text-emerald'
                      : `text-emerald ${s.status === 'new' ? 'border-emerald/15' : STATUS_RING[s.status]}`
                  }`}
                >
                  {selectMode && isSelected ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  ) : (
                    s.number
                  )}
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
              </span>
            )
            return (
              <li key={s.number}>
                {selectMode ? (
                  <button
                    type="button"
                    onClick={() => toggleSelected(s.number)}
                    aria-pressed={isSelected}
                    className={`block w-full rounded-xl px-3 py-3.5 text-left transition active:scale-[0.99] ${
                      isSelected ? 'bg-emerald/5' : 'active:bg-emerald/5'
                    }`}
                  >
                    {row}
                  </button>
                ) : (
                  <Link
                    to={`/surah/${s.number}`}
                    className="block rounded-xl px-3 py-3.5 transition active:scale-[0.99] active:bg-emerald/5"
                  >
                    {row}
                    {/* Only surahs with real progress get a badge — new stays uncluttered. */}
                    {s.status !== 'new' && (
                      <span className="ml-12 mt-1.5 block">
                        <StatusBadge status={s.status} />
                      </span>
                    )}
                  </Link>
                )}
              </li>
            )
          })}
        </ul>
      </main>

      {selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl border-t border-emerald/10 bg-paper/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-emerald">
              {t('index.selectedCount', { n: selected.size })}
            </p>
            <button
              type="button"
              onClick={() => setSelected(new Set())}
              className="text-xs font-medium text-muted"
            >
              {t('index.clearSelection')}
            </button>
          </div>
          <div className="mt-2.5 flex gap-2">
            <button
              type="button"
              onClick={() => applySelectedStatus('memorized')}
              className="btn-primary flex-1 px-4 py-2 text-sm"
            >
              {t('index.markMemorized')}
            </button>
            <button
              type="button"
              onClick={() => applySelectedStatus('revision')}
              className="flex-1 rounded-2xl border border-clay/30 bg-clay/10 px-4 py-2 text-sm font-medium text-clay transition active:scale-[0.98]"
            >
              {t('index.markRevision')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
