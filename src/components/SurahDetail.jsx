// A single surah: Arabic ayahs in exact QCF glyphs, with optional
// translation and per-ayah tafsir, a status control, tadabbur notes, audio
// with single-ayah repeat and range looping, and a "test yourself" recall
// mode.

import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getSurah, audioUrlAt, AUDIO_BITRATES } from '../utils/api'
import {
  getSettings,
  setSetting,
  getSurahEntry,
  setSurahStatus,
  setAyahRangeStatus,
  getAyahStatus,
  getMemorizedAyahCount,
  getBookmarks,
  toggleBookmark,
  STATUSES,
  REPEAT_OPTIONS,
} from '../utils/storage'
import { STATUS_STYLE } from '../utils/statusStyle'
import { ensurePageFont } from '../utils/fonts'
import { schedulePush } from '../utils/cloudSync'
import { useLang } from '../utils/i18n.jsx'
import AyahCard from './AyahCard'
import BackButton from './BackButton'
import LoadingSpinner from './LoadingSpinner'
import StatusControl from './StatusControl'
import NotesEditor from './NotesEditor'

const TEST_MODES = ['off', 'hide', 'firstWord']

export default function SurahDetail() {
  const { number } = useParams()
  const surahNumber = Number(number)
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { t } = useLang()

  const [settings, setSettings] = useState(() => getSettings())
  const [entry, setEntry] = useState(() => getSurahEntry(surahNumber))
  const status = entry.status
  const [surah, setSurah] = useState(null)
  const [glyphPages, setGlyphPages] = useState(() => new Set())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // --- audio -----------------------------------------------------------
  const [playing, setPlaying] = useState(null) // { kind: 'ayah'|'range', index }
  const [loadingAudio, setLoadingAudio] = useState(false)
  const audioRef = useRef(null)
  const repeatsLeftRef = useRef(0)

  // --- test-yourself mode ------------------------------------------------
  const [testMode, setTestMode] = useState('off')

  // --- loop-range selection ----------------------------------------------
  const [rangeMode, setRangeMode] = useState(false)
  const [range, setRange] = useState({ start: null, end: null })

  // --- ayah-range status marking ------------------------------------------
  const [ayahRangeMode, setAyahRangeMode] = useState(false)
  const [ayahRange, setAyahRange] = useState({ start: null, end: null })

  // --- options dropdown (status/reading/practice) -------------------------
  // Sticky below the header so it stays reachable while scrolled deep into a
  // long surah, and collapsible so it doesn't permanently eat reading space.
  const [optionsOpen, setOptionsOpen] = useState(true)

  // --- bookmarks -----------------------------------------------------------
  const [bookmarkedSet, setBookmarkedSet] = useState(
    () => new Set(getBookmarks().filter((b) => b.surah === surahNumber).map((b) => b.ayah))
  )

  // --- jump to ayah ----------------------------------------------------
  const ayahRefs = useRef({})
  const jumpedFromLinkRef = useRef(false)
  const [ayahSearchOpen, setAyahSearchOpen] = useState(false)
  const [ayahSearchValue, setAyahSearchValue] = useState('')
  const [highlightedAyah, setHighlightedAyah] = useState(null)
  const highlightTimerRef = useRef(null)

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
    setEntry(getSurahEntry(surahNumber))
    setTestMode('off')
    setRangeMode(false)
    setRange({ start: null, end: null })
    setAyahRangeMode(false)
    setAyahRange({ start: null, end: null })
    setOptionsOpen(true)
    setBookmarkedSet(new Set(getBookmarks().filter((b) => b.surah === surahNumber).map((b) => b.ayah)))
    setAyahSearchOpen(false)
    setAyahSearchValue('')
    jumpedFromLinkRef.current = false
    ayahRefs.current = {}
    stopAudio()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surahNumber])

  useEffect(() => () => stopAudio(), [])
  useEffect(() => () => clearTimeout(highlightTimerRef.current), [])

  // Deep-link support for bookmarks: /surah/N?ayah=X jumps straight there
  // once the surah has loaded.
  useEffect(() => {
    if (!surah || jumpedFromLinkRef.current) return
    const ayahParam = Number(searchParams.get('ayah'))
    if (ayahParam) {
      jumpedFromLinkRef.current = true
      requestAnimationFrame(() => jumpToAyah(ayahParam))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [surah])

  function changeStatus(next) {
    const updated = setSurahStatus(surahNumber, next)
    setEntry(updated)
    schedulePush()
  }

  function toggleSetting(key) {
    setSettings(setSetting(key, !settings[key]))
  }

  function cycleTestMode() {
    const next = TEST_MODES[(TEST_MODES.indexOf(testMode) + 1) % TEST_MODES.length]
    setTestMode(next)
  }

  function cycleRepeat() {
    const i = REPEAT_OPTIONS.indexOf(settings.repeatCount)
    const next = REPEAT_OPTIONS[(i + 1) % REPEAT_OPTIONS.length]
    setSettings(setSetting('repeatCount', next))
  }

  // --- audio engine --------------------------------------------------------
  // Only one <audio> element plays at a time, shared by single-ayah repeat
  // and range looping below.

  function stopAudio() {
    if (audioRef.current) {
      audioRef.current.onended = null
      audioRef.current.onerror = null
      audioRef.current.pause()
      audioRef.current = null
    }
    setPlaying(null)
    setLoadingAudio(false)
  }

  // Plays one ayah by its global number, falling through AUDIO_BITRATES on
  // error (some reciters aren't hosted at every bitrate). Calls onEnded(true)
  // once every bitrate has failed so callers can give up on this ayah instead
  // of retrying an already-broken URL again on the next repeat.
  function playGlobalNumber(globalNumber, onEnded, brIdx = 0) {
    const audio = new Audio(audioUrlAt(settings.reciter, globalNumber, AUDIO_BITRATES[brIdx]))
    audioRef.current = audio
    setLoadingAudio(true)
    audio.onplaying = () => {
      if (audioRef.current === audio) setLoadingAudio(false)
    }
    audio.onended = () => {
      if (audioRef.current === audio) onEnded(false)
    }
    audio.onerror = () => {
      if (audioRef.current !== audio) return
      if (brIdx + 1 < AUDIO_BITRATES.length) {
        playGlobalNumber(globalNumber, onEnded, brIdx + 1)
      } else {
        onEnded(true)
      }
    }
    audio.play().catch(() => {})
  }

  function playAyahLoop(index) {
    const ayah = surah.ayahs[index]
    if (!ayah) return
    repeatsLeftRef.current = settings.repeatCount === 'inf' ? Infinity : settings.repeatCount
    setPlaying({ kind: 'ayah', index })
    const step = () =>
      playGlobalNumber(ayah.number, (failed) => {
        // Every bitrate failed — stop rather than hammering the same broken
        // URL again on the next repeat.
        if (failed) {
          stopAudio()
          return
        }
        repeatsLeftRef.current -= 1
        if (repeatsLeftRef.current > 0) step()
        else stopAudio()
      })
    step()
  }

  function toggleAyahPlay(index) {
    if (playing?.kind === 'ayah' && playing.index === index) {
      stopAudio()
    } else {
      playAyahLoop(index)
    }
  }

  function playRangeLoop() {
    if (range.start == null || range.end == null || !surah) return
    const lo = Math.min(range.start, range.end)
    const hi = Math.max(range.start, range.end)
    repeatsLeftRef.current = settings.repeatCount === 'inf' ? Infinity : settings.repeatCount
    let cursor = lo
    setPlaying({ kind: 'range', index: cursor })
    const step = () => {
      const ayah = surah.ayahs[cursor]
      playGlobalNumber(ayah.number, () => {
        if (cursor < hi) {
          cursor += 1
          setPlaying({ kind: 'range', index: cursor })
          step()
        } else {
          repeatsLeftRef.current -= 1
          if (repeatsLeftRef.current > 0) {
            cursor = lo
            setPlaying({ kind: 'range', index: cursor })
            step()
          } else {
            stopAudio()
          }
        }
      })
    }
    step()
  }

  function toggleRangePlay() {
    if (playing?.kind === 'range') stopAudio()
    else playRangeLoop()
  }

  // --- loop-range selection --------------------------------------------

  function toggleRangeMode() {
    stopAudio()
    if (rangeMode) {
      setRangeMode(false)
    } else {
      clearAyahRange()
      setRangeMode(true)
      setRange({ start: null, end: null })
    }
  }

  function selectRangeAyah(index) {
    setRange((r) => {
      if (r.start == null || r.end != null) return { start: index, end: null }
      if (index === r.start) return { start: null, end: null }
      setRangeMode(false)
      return { start: r.start, end: index }
    })
  }

  function clearRange() {
    stopAudio()
    setRange({ start: null, end: null })
    setRangeMode(false)
  }

  const hasCommittedRange = range.start != null && range.end != null
  const rangeLo = hasCommittedRange ? Math.min(range.start, range.end) : null
  const rangeHi = hasCommittedRange ? Math.max(range.start, range.end) : null

  // --- ayah-range status marking ------------------------------------------
  // Same tap-start/tap-end interaction as loop-range above, but sets a
  // memorization status on the selected span instead of playing it. Only
  // one range-select mode can be active at a time.

  function toggleAyahRangeMode() {
    if (ayahRangeMode) {
      setAyahRangeMode(false)
    } else {
      clearRange()
      setAyahRangeMode(true)
      setAyahRange({ start: null, end: null })
    }
  }

  function selectAyahStatusRange(index) {
    setAyahRange((r) => {
      if (r.start == null || r.end != null) return { start: index, end: null }
      // Tapping the same ayah again marks just that one ayah, unlike the
      // audio loop-range picker — a single ayah is a common target here
      // (e.g. one verse someone wants to flag), not just a range endpoint.
      setAyahRangeMode(false)
      return { start: r.start, end: index }
    })
  }

  function clearAyahRange() {
    setAyahRange({ start: null, end: null })
    setAyahRangeMode(false)
  }

  function applyAyahRangeStatus(newStatus) {
    if (!hasCommittedAyahRange || !surah) return
    const fromAyah = surah.ayahs[ayahRangeLo].numberInSurah
    const toAyah = surah.ayahs[ayahRangeHi].numberInSurah
    const updated = setAyahRangeStatus(surahNumber, fromAyah, toAyah, newStatus, surah.ayahs.length)
    setEntry(updated)
    schedulePush()
    clearAyahRange()
  }

  const hasCommittedAyahRange = ayahRange.start != null && ayahRange.end != null
  const ayahRangeLo = hasCommittedAyahRange ? Math.min(ayahRange.start, ayahRange.end) : null
  const ayahRangeHi = hasCommittedAyahRange ? Math.max(ayahRange.start, ayahRange.end) : null

  // --- bookmarks -----------------------------------------------------------

  function toggleBookmarkAt(numberInSurah) {
    toggleBookmark(surahNumber, numberInSurah)
    setBookmarkedSet((prev) => {
      const next = new Set(prev)
      if (next.has(numberInSurah)) next.delete(numberInSurah)
      else next.add(numberInSurah)
      return next
    })
    schedulePush()
  }

  // --- jump to ayah ----------------------------------------------------

  function jumpToAyah(numberInSurah) {
    const el = ayahRefs.current[numberInSurah]
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedAyah(numberInSurah)
    clearTimeout(highlightTimerRef.current)
    highlightTimerRef.current = setTimeout(() => setHighlightedAyah(null), 1800)
  }

  function toggleAyahSearch() {
    setAyahSearchOpen((open) => !open)
    setAyahSearchValue('')
  }

  function submitAyahSearch(e) {
    e.preventDefault()
    const n = Number(ayahSearchValue)
    if (!surah || !Number.isInteger(n) || n < 1 || n > surah.ayahs.length) return
    jumpToAyah(n)
    setAyahSearchOpen(false)
    setAyahSearchValue('')
  }

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <BackButton onClick={() => navigate('/surahs')} />
        <button
          type="button"
          onClick={() => setOptionsOpen((o) => !o)}
          disabled={!surah}
          aria-expanded={optionsOpen}
          aria-label={t('detail.toggleOptions')}
          className="flex flex-col items-center rounded-lg px-2 py-1 text-center transition active:scale-95 disabled:active:scale-100"
        >
          <span className="flex items-center gap-1">
            <span className="text-sm font-semibold text-emerald">
              {surah?.englishName || `Surah ${surahNumber}`}
            </span>
            {surah && (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className={`shrink-0 text-muted transition-transform ${optionsOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            )}
          </span>
          {surah && (
            <span className="font-quran text-base text-emerald" dir="rtl" lang="ar">
              {surah.name}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={toggleAyahSearch}
          aria-pressed={ayahSearchOpen}
          aria-label={t('detail.goToAyah')}
          disabled={!surah}
          className="rounded-full p-1.5 text-muted transition active:scale-90 disabled:opacity-40"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
      </header>

      {surah && ayahSearchOpen && (
        <div className="border-b border-emerald/5 px-5 py-3">
          <form onSubmit={submitAyahSearch} className="flex gap-2">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={surah.ayahs.length}
              value={ayahSearchValue}
              onChange={(e) => setAyahSearchValue(e.target.value)}
              placeholder={t('detail.goToAyahPlaceholder', { n: surah.ayahs.length })}
              autoFocus
              className="w-full rounded-xl border border-emerald/15 bg-transparent px-4 py-2.5 text-sm text-emerald placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald/20"
            />
            <button type="submit" className="btn-primary shrink-0 px-4 py-2 text-sm">
              {t('detail.go')}
            </button>
          </form>
        </div>
      )}

      {surah && optionsOpen && (
        <div className="sticky top-[85px] z-[5] bg-paper/95 backdrop-blur">
          <div className="border-b border-emerald/5 px-5 py-3">
            <StatusControl status={status} onChange={changeStatus} />
            {entry.ranges && entry.ranges.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                {t('detail.ayahProgress', {
                  done: getMemorizedAyahCount(entry, surah.ayahs.length),
                  total: surah.ayahs.length,
                })}
              </p>
            )}
          </div>

          <div className="border-b border-emerald/5 px-5 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('options.reading')}
            </p>
            <div className="flex flex-wrap gap-2">
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
          </div>

          <div className="border-b border-emerald/5 px-5 py-3">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">
              {t('options.practice')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={cycleTestMode}
                aria-pressed={testMode !== 'off'}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                  testMode !== 'off'
                    ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                    : 'text-muted ring-1 ring-emerald/10'
                }`}
              >
                {t(`test.mode.${testMode}`)}
              </button>
              <button
                type="button"
                onClick={cycleRepeat}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium text-muted ring-1 ring-emerald/10 transition active:scale-95"
              >
                {t('audio.repeat', {
                  n: settings.repeatCount === 'inf' ? '∞' : settings.repeatCount,
                })}
              </button>
              <button
                type="button"
                onClick={toggleRangeMode}
                aria-pressed={rangeMode || hasCommittedRange}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                  rangeMode || hasCommittedRange
                    ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                    : 'text-muted ring-1 ring-emerald/10'
                }`}
              >
                {t('audio.loopRange')}
              </button>
              <button
                type="button"
                onClick={toggleAyahRangeMode}
                aria-pressed={ayahRangeMode || hasCommittedAyahRange}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                  ayahRangeMode || hasCommittedAyahRange
                    ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                    : 'text-muted ring-1 ring-emerald/10'
                }`}
              >
                {t('ayahRange.mark')}
              </button>
            </div>
            {rangeMode && (
              <p className="mt-2 text-xs text-muted">{t('audio.selectRangeHint')}</p>
            )}
            {ayahRangeMode && (
              <p className="mt-2 text-xs text-muted">{t('ayahRange.selectHint')}</p>
            )}
          </div>
        </div>
      )}

      {surah && <NotesEditor surahNumber={surahNumber} />}

      <main className={`px-5 pt-4 ${hasCommittedAyahRange ? 'pb-40' : 'pb-28'}`}>
        {loading && <LoadingSpinner label={t('detail.loading')} />}

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
            {surah.ayahs.map((ayah, index) => (
              <AyahCard
                key={`${ayah.number}-${testMode}`}
                ayah={ayah}
                size={settings.readingSize}
                glyphs={
                  !!ayah.words?.length && ayah.words.every((w) => glyphPages.has(w.page))
                }
                showTranslation={settings.showTranslation}
                showTafsirToggle={settings.showTafsir}
                testMode={testMode}
                isPlaying={
                  (playing?.kind === 'ayah' || playing?.kind === 'range') &&
                  playing.index === index
                }
                isLoadingAudio={loadingAudio && playing?.index === index}
                onTogglePlay={() => toggleAyahPlay(index)}
                ayahStatus={getAyahStatus(entry, ayah.numberInSurah)}
                bookmarked={bookmarkedSet.has(ayah.numberInSurah)}
                onToggleBookmark={() => toggleBookmarkAt(ayah.numberInSurah)}
                highlighted={highlightedAyah === ayah.numberInSurah}
                cardRef={(el) => {
                  ayahRefs.current[ayah.numberInSurah] = el
                }}
                rangeSelectable={rangeMode || ayahRangeMode}
                inRange={
                  rangeMode
                    ? range.start === index
                    : ayahRangeMode
                    ? ayahRange.start === index
                    : hasCommittedRange
                    ? index >= rangeLo && index <= rangeHi
                    : hasCommittedAyahRange
                    ? index >= ayahRangeLo && index <= ayahRangeHi
                    : false
                }
                rangeEndpoint={
                  rangeMode
                    ? range.start === index
                      ? 'start'
                      : null
                    : ayahRangeMode
                    ? ayahRange.start === index
                      ? 'start'
                      : null
                    : hasCommittedRange
                    ? index === rangeLo
                      ? 'start'
                      : index === rangeHi
                      ? 'end'
                      : null
                    : hasCommittedAyahRange
                    ? index === ayahRangeLo
                      ? 'start'
                      : index === ayahRangeHi
                      ? 'end'
                      : null
                    : null
                }
                onSelectRange={() => {
                  if (rangeMode) selectRangeAyah(index)
                  else if (ayahRangeMode) selectAyahStatusRange(index)
                }}
              />
            ))}
          </>
        )}
      </main>

      {hasCommittedRange && surah && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl border-t border-emerald/10 bg-paper/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleRangePlay}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald text-paper transition active:scale-90"
              aria-label={playing?.kind === 'range' ? t('audio.pause') : t('audio.play')}
            >
              {loadingAudio && playing?.kind === 'range' ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
              ) : playing?.kind === 'range' ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.14v13.72a1 1 0 0 0 1.5.87l11-6.86a1 1 0 0 0 0-1.74l-11-6.86A1 1 0 0 0 8 5.14Z" />
                </svg>
              )}
            </button>
            <p className="grow text-sm font-medium text-emerald">
              {t('audio.loopingRange', {
                start: surah.ayahs[rangeLo].numberInSurah,
                end: surah.ayahs[rangeHi].numberInSurah,
              })}
            </p>
            <button
              type="button"
              onClick={clearRange}
              aria-label={t('audio.clearRange')}
              className="rounded-full p-1.5 text-muted transition active:scale-90"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {hasCommittedAyahRange && surah && (
        <div className="fixed inset-x-0 bottom-0 mx-auto max-w-2xl border-t border-emerald/10 bg-paper/95 px-5 py-3 backdrop-blur">
          <div className="flex items-center gap-3">
            <p className="grow text-sm font-medium text-emerald">
              {ayahRangeLo === ayahRangeHi
                ? t('ayahRange.labelSingle', { n: surah.ayahs[ayahRangeLo].numberInSurah })
                : t('ayahRange.label', {
                    start: surah.ayahs[ayahRangeLo].numberInSurah,
                    end: surah.ayahs[ayahRangeHi].numberInSurah,
                  })}
            </p>
            <button
              type="button"
              onClick={clearAyahRange}
              aria-label={t('audio.clearRange')}
              className="rounded-full p-1.5 text-muted transition active:scale-90"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => applyAyahRangeStatus(s)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${STATUS_STYLE[s].active}`}
              >
                {t(`status.${s}`)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
