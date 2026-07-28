// A single surah: Arabic ayahs in exact QCF glyphs, with optional
// translation and per-ayah tafsir, a status control, and tadabbur notes.
// Audio with repeat/loop arrives in a later phase.

import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getSurah } from '../utils/api'
import { getSettings, setSetting, getSurahStatus, setSurahStatus } from '../utils/storage'
import { ensurePageFont } from '../utils/fonts'
import { useLang } from '../utils/i18n.jsx'
import AyahCard from './AyahCard'
import StatusControl from './StatusControl'
import NotesEditor from './NotesEditor'

export default function SurahDetail() {
  const { number } = useParams()
  const surahNumber = Number(number)
  const navigate = useNavigate()
  const { t } = useLang()

  const [settings, setSettings] = useState(() => getSettings())
  const [status, setStatus] = useState(() => getSurahStatus(surahNumber))
  const [surah, setSurah] = useState(null)
  const [glyphPages, setGlyphPages] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(false)
    try {
      const result = await getSurah(surahNumber, {
        translation: settings.showTranslation,
        translationEdition: settings.translationEdition,
      })
      const pages = new Set()
      for (const a of result.ayahs) {
        for (const w of a.words || []) pages.add(w.page)
      }
      const ready = new Set()
      await Promise.all(
        [...pages].map((pg) =>
          ensurePageFont(pg)
            .then(() => ready.add(pg))
            .catch(() => {})
        )
      )
      setGlyphPages(ready)
      setSurah(result)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNumber, settings.showTranslation, settings.translationEdition])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setStatus(getSurahStatus(surahNumber))
  }, [surahNumber])

  function changeStatus(next) {
    setSurahStatus(surahNumber, next)
    setStatus(next)
  }

  function toggleSetting(key) {
    setSettings(setSetting(key, !settings[key]))
  }

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <button
          onClick={() => navigate('/surahs')}
          aria-label={t('common.back')}
          className="rounded-full p-1.5 text-muted transition active:scale-90"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-emerald">
            {surah?.englishName || `Surah ${surahNumber}`}
          </p>
          {surah && (
            <p className="font-quran text-base text-emerald" dir="rtl" lang="ar">
              {surah.name}
            </p>
          )}
        </div>
        <span className="w-[34px]" aria-hidden="true" />
      </header>

      {surah && (
        <>
          <div className="border-b border-emerald/5 px-5 py-3">
            <StatusControl status={status} onChange={changeStatus} />
          </div>

          <div className="flex gap-2 border-b border-emerald/5 px-5 py-3">
            <button
              type="button"
              onClick={() => toggleSetting('showTranslation')}
              aria-pressed={settings.showTranslation}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                settings.showTranslation
                  ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                  : 'text-muted ring-1 ring-emerald/10'
              }`}
            >
              {t('detail.translation')}
            </button>
            <button
              type="button"
              onClick={() => toggleSetting('showTafsir')}
              aria-pressed={settings.showTafsir}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                settings.showTafsir
                  ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                  : 'text-muted ring-1 ring-emerald/10'
              }`}
            >
              {t('tafsir.title')}
            </button>
          </div>

          <NotesEditor surahNumber={surahNumber} />
        </>
      )}

      <main className="px-5 pb-16 pt-4">
        {loading && (
          <div className="flex flex-col items-center gap-4 py-24 text-muted">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald/20 border-t-emerald" />
            <p className="text-sm">{t('detail.loading')}</p>
          </div>
        )}

        {!loading && error && (
          <div className="flex flex-col items-center gap-5 py-24 text-center">
            <p className="max-w-xs text-muted">{t('detail.unable')}</p>
            <button className="btn-ghost" onClick={load}>
              {t('detail.tryAgain')}
            </button>
          </div>
        )}

        {!loading && !error && surah && (
          <>
            {surahNumber !== 1 && surahNumber !== 9 && (
              <p
                className="mb-4 mt-2 text-center font-quran text-2xl leading-loose text-emerald sm:text-3xl"
                dir="rtl"
                lang="ar"
              >
                بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
              </p>
            )}
            {surah.ayahs.map((ayah) => (
              <AyahCard
                key={ayah.number}
                ayah={ayah}
                size={settings.readingSize}
                glyphs={
                  !!ayah.words?.length && ayah.words.every((w) => glyphPages.has(w.page))
                }
                showTranslation={settings.showTranslation}
                showTafsirToggle={settings.showTafsir}
              />
            ))}
          </>
        )}
      </main>
    </div>
  )
}
