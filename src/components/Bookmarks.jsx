// All bookmarked ayat, most recently saved first. Each row jumps straight
// to that ayah in its surah; the bookmark icon removes it from here.

import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { listSurahs } from '../utils/api'
import { getBookmarks, toggleBookmark } from '../utils/storage'
import { schedulePush } from '../utils/cloudSync'
import { useLang } from '../utils/i18n.jsx'

export default function Bookmarks() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [items, setItems] = useState(null)

  useEffect(() => {
    load()
  }, [])

  function load() {
    const bookmarks = getBookmarks()
    listSurahs().then((surahs) => {
      const bySurah = new Map(surahs.map((s) => [s.number, s]))
      const list = bookmarks
        .map((b) => ({ ...b, surahInfo: bySurah.get(b.surah) }))
        .filter((b) => b.surahInfo)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      setItems(list)
    })
  }

  function remove(b) {
    toggleBookmark(b.surah, b.ayah)
    setItems((list) => list.filter((x) => !(x.surah === b.surah && x.ayah === b.ayah)))
    schedulePush()
  }

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <button
          onClick={() => navigate('/')}
          aria-label={t('common.back')}
          className="rounded-full p-1.5 text-muted transition active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold text-emerald">{t('dashboard.bookmarkedAyat')}</h1>
      </header>

      <main className="px-3 pb-10 pt-2">
        {items === null && (
          <div className="flex flex-col items-center gap-4 py-24 text-muted">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald/20 border-t-emerald" />
          </div>
        )}

        {items !== null && items.length === 0 && (
          <p className="py-16 text-center text-sm text-muted">{t('bookmarks.empty')}</p>
        )}

        <ul className="flex flex-col gap-2 px-2 py-2">
          {items?.map((b) => (
            <li key={`${b.surah}-${b.ayah}`}>
              <div className="flex items-center gap-3 rounded-xl border border-amber/20 bg-amber/5 px-4 py-3">
                <Link to={`/surah/${b.surah}?ayah=${b.ayah}`} className="min-w-0 grow">
                  <span className="block text-[15px] font-medium text-emerald">
                    {b.surahInfo.englishName}
                  </span>
                  <span className="block text-xs text-muted">
                    {t('ayahRange.labelSingle', { n: b.ayah })}
                  </span>
                </Link>
                <span className="font-quran shrink-0 text-lg text-emerald" dir="rtl" lang="ar">
                  {b.surahInfo.name}
                </span>
                <button
                  type="button"
                  onClick={() => remove(b)}
                  aria-label={t('bookmark.remove')}
                  className="shrink-0 rounded-full p-1.5 text-amber transition active:scale-90"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M6 3a1 1 0 0 0-1 1v17l7-4 7 4V4a1 1 0 0 0-1-1H6Z" />
                  </svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      </main>
    </div>
  )
}
