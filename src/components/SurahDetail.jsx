// A single surah: Arabic ayahs in exact QCF glyphs, with optional
// translation and per-ayah tafsir, a status control, tadabbur notes, audio
// with single-ayah repeat and range looping, and a "test yourself" recall
// mode.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { getSurah, audioUrlAt, AUDIO_BITRATES, SURAH_NAMES, TOTAL_SURAHS } from '../utils/api'
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
  setLastRead,
  STATUSES,
  REPEAT_OPTIONS,
  READING_SCALE_RANGE,
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
import MushafView from './MushafView'

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

  // --- bottom toolbar "More" sheet (status, translation/tafsir, mark ayat) -
  const [moreOpen, setMoreOpen] = useState(false)

  // --- mushaf view (real printed-page layout, tap-one-ayah actions only) --
  const [mushafSelectedAyah, setMushafSelectedAyah] = useState(null)
  const mushafPages = useMemo(() => {
    if (!surah) return []
    const pages = new Set()
    for (const a of surah.ayahs) for (const w of a.words || []) pages.add(w.page)
    return [...pages].sort((a, b) => a - b)
  }, [surah])

  // --- pinch-to-resize Arabic text ---------------------------------------
  // Two-finger pinch over the ayah list live-adjusts settings.readingScale;
  // native page zoom is disabled (viewport meta), so this is the only zoom
  // gesture in play. Only the final value (on lift) is persisted — every
  // touchmove would otherwise spam localStorage.
  const mainRef = useRef(null)
  const pinchStartRef = useRef(null) // { dist, scale }
  const latestScaleRef = useRef(null) // live value during a pinch; read by the touchend handler so it never persists a stale settings.readingScale

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

  // --- scroll position (for the "Ayah N of Total" indicator) -----------
  const scrollRef = useRef(null)
  const scrollRafRef = useRef(null)
  const [visibleAyahNum, setVisibleAyahNum] = useState(1)

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
    setMoreOpen(false)
    setMushafSelectedAyah(null)
    setBookmarkedSet(new Set(getBookmarks().filter((b) => b.surah === surahNumber).map((b) => b.ayah)))
    setAyahSearchOpen(false)
    setAyahSearchValue('')
    setVisibleAyahNum(1)
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

  // Tracks which ayah is currently at the top of the viewport, for the
  // sticky bar's "Ayah N of Total" indicator — mainly useful on long surahs
  // (Al-Baqarah's 286 ayat) where there's otherwise no sense of how far in
  // you are. Binary search over ayahRefs (positions are monotonic in scroll
  // order) keeps this cheap even during fast scrolling.
  useEffect(() => {
    const container = scrollRef.current
    if (!container || !surah) return
    const THRESHOLD = 140 // roughly the header + sticky bar's combined height
    function computeVisible() {
      scrollRafRef.current = null
      const ayahs = surah.ayahs
      let lo = 0
      let hi = ayahs.length - 1
      let result = ayahs[0]?.numberInSurah ?? 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const el = ayahRefs.current[ayahs[mid].numberInSurah]
        if (!el) break
        if (el.getBoundingClientRect().top <= THRESHOLD) {
          result = ayahs[mid].numberInSurah
          lo = mid + 1
        } else {
          hi = mid - 1
        }
      }
      setVisibleAyahNum(result)
    }
    function onScroll() {
      if (scrollRafRef.current == null) scrollRafRef.current = requestAnimationFrame(computeVisible)
    }
    computeVisible()
    container.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      container.removeEventListener('scroll', onScroll)
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current)
    }
  }, [surah])

  // Powers the Reader tab and Home's "Continue" card — a plain reading
  // position, independent of memorization status. Debounced so fast
  // scrolling doesn't spam localStorage writes.
  const lastReadTimerRef = useRef(null)
  useEffect(() => {
    if (!surah) return
    clearTimeout(lastReadTimerRef.current)
    lastReadTimerRef.current = setTimeout(() => {
      setLastRead(surahNumber, visibleAyahNum)
    }, 800)
    return () => clearTimeout(lastReadTimerRef.current)
  }, [surah, surahNumber, visibleAyahNum])

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

  // --- pinch-to-resize Arabic text -----------------------------------------
  // touchmove is attached natively with { passive: false } below — React's
  // JSX touch handlers are passive by default, so calling preventDefault()
  // on one is silently ignored (and logs a warning).

  function pinchDistance(touches) {
    const [a, b] = touches
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }

  function onTouchStart(e) {
    if (e.touches.length === 2) {
      pinchStartRef.current = { dist: pinchDistance(e.touches), scale: settings.readingScale }
      latestScaleRef.current = settings.readingScale
    }
  }

  function onTouchEnd(e) {
    if (e.touches.length < 2 && pinchStartRef.current) {
      pinchStartRef.current = null
      if (latestScaleRef.current != null) {
        setSettings(setSetting('readingScale', latestScaleRef.current))
        latestScaleRef.current = null
      }
    }
  }

  useEffect(() => {
    const el = mainRef.current
    if (!el) return
    function onTouchMove(e) {
      if (e.touches.length !== 2 || !pinchStartRef.current) return
      e.preventDefault()
      const { dist, scale } = pinchStartRef.current
      const [lo, hi] = READING_SCALE_RANGE
      const next = Math.min(hi, Math.max(lo, scale * (pinchDistance(e.touches) / dist)))
      latestScaleRef.current = next
      setSettings((prev) => ({ ...prev, readingScale: next }))
    }
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => el.removeEventListener('touchmove', onTouchMove)
  }, [])

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

  // --- mushaf view ----------------------------------------------------------

  function setMushafAyahStatus(newStatus) {
    if (mushafSelectedAyah == null || !surah) return
    const updated = setAyahRangeStatus(
      surahNumber,
      mushafSelectedAyah,
      mushafSelectedAyah,
      newStatus,
      surah.ayahs.length
    )
    setEntry(updated)
    schedulePush()
    setMushafSelectedAyah(null)
  }

  const mushafSelectedIndex =
    mushafSelectedAyah != null && surah
      ? surah.ayahs.findIndex((a) => a.numberInSurah === mushafSelectedAyah)
      : -1

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
    <div ref={scrollRef} className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <BackButton onClick={() => navigate('/surahs')} />
        <div className="text-center">
          <p className="text-sm font-semibold text-emerald">
            {surah?.englishName || `Surah ${surahNumber}`}
          </p>
          {surah && (
            <p className="font-quran text-base text-emerald" dir="rtl" lang="ar">
              {surah.name}
            </p>
          )}
          {surah && (
            <p className="text-[11px] text-muted">
              {t('detail.ayahPosition', { n: visibleAyahNum, total: surah.ayahs.length })}
            </p>
          )}
        </div>
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

      {surah && (rangeMode || ayahRangeMode) && (
        <div className="border-b border-emerald/5 bg-amber/5 px-5 py-2.5 text-center">
          <p className="text-xs text-muted">
            {rangeMode ? t('audio.selectRangeHint') : t('ayahRange.selectHint')}
          </p>
          <button
            type="button"
            onClick={rangeMode ? toggleRangeMode : toggleAyahRangeMode}
            className="mt-1 text-xs font-medium text-emerald underline underline-offset-2"
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {surah && <NotesEditor surahNumber={surahNumber} />}

      <main
        ref={mainRef}
        className={`px-5 pt-4 ${hasCommittedAyahRange ? 'pb-40' : 'pb-28'}`}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
      >
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
            {settings.mushafView ? (
              <MushafView
                pages={mushafPages}
                glyphPages={glyphPages}
                surahNumber={surahNumber}
                selectedAyah={mushafSelectedAyah}
                onSelectAyah={setMushafSelectedAyah}
              />
            ) : (
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
                scale={settings.readingScale}
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

            {/* Onboarding nudges people toward memorizing sequentially
                (Juz 30 forward), so continuing to the next surah shouldn't
                mean backing out to the index each time. */}
            <div className="mt-8 flex gap-3 border-t border-emerald/10 pt-6">
              {surahNumber > 1 ? (
                <button
                  type="button"
                  onClick={() => navigate(`/surah/${surahNumber - 1}`)}
                  className="flex flex-1 items-center gap-2 rounded-xl border border-emerald/10 px-3 py-3 text-left transition active:scale-[0.99]"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted" aria-hidden="true">
                    <path d="m15 18-6-6 6-6" />
                  </svg>
                  <span className="min-w-0">
                    <span className="block text-[11px] text-muted">{t('detail.previousSurah')}</span>
                    <span className="block truncate text-sm font-medium text-emerald">
                      {SURAH_NAMES[surahNumber - 2]}
                    </span>
                  </span>
                </button>
              ) : (
                <div className="flex-1" />
              )}
              {surahNumber < TOTAL_SURAHS ? (
                <button
                  type="button"
                  onClick={() => navigate(`/surah/${surahNumber + 1}`)}
                  className="flex flex-1 items-center justify-end gap-2 rounded-xl border border-emerald/10 px-3 py-3 text-right transition active:scale-[0.99]"
                >
                  <span className="min-w-0">
                    <span className="block text-[11px] text-muted">{t('detail.nextSurah')}</span>
                    <span className="block truncate text-sm font-medium text-emerald">
                      {SURAH_NAMES[surahNumber]}
                    </span>
                  </span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 text-muted" aria-hidden="true">
                    <path d="m9 18 6-6-6-6" />
                  </svg>
                </button>
              ) : (
                <div className="flex-1" />
              )}
            </div>
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

      {surah && !hasCommittedRange && !hasCommittedAyahRange && !rangeMode && !ayahRangeMode && (
        <nav className="fixed inset-x-0 bottom-0 mx-auto flex w-full max-w-2xl border-t border-emerald/10 bg-paper/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 backdrop-blur">
          <button
            type="button"
            onClick={toggleRangeMode}
            aria-pressed={rangeMode}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-muted transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M8 5.14v13.72a1 1 0 0 0 1.5.87l11-6.86a1 1 0 0 0 0-1.74l-11-6.86A1 1 0 0 0 8 5.14Z" />
            </svg>
            {t('detail.listen')}
          </button>
          <button
            type="button"
            onClick={cycleRepeat}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-muted transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m17 2 4 4-4 4" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <path d="m7 22-4-4 4-4" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
            {t('audio.repeat', { n: settings.repeatCount === 'inf' ? '∞' : settings.repeatCount })}
          </button>
          <button
            type="button"
            onClick={cycleTestMode}
            aria-pressed={testMode !== 'off'}
            className={`flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium transition active:scale-95 ${
              testMode !== 'off' ? 'text-amber' : 'text-muted'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            {t(`test.mode.${testMode}`)}
          </button>
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-pressed={moreOpen}
            className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-medium text-muted transition active:scale-95"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <circle cx="5" cy="12" r="1.75" />
              <circle cx="12" cy="12" r="1.75" />
              <circle cx="19" cy="12" r="1.75" />
            </svg>
            {t('detail.more')}
          </button>
        </nav>
      )}

      {surah && moreOpen && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/30"
          onClick={() => setMoreOpen(false)}
        >
          <div
            className="mx-auto w-full max-w-2xl rounded-t-2xl bg-paper p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald">{t('detail.more')}</p>
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="text-xs font-medium text-muted"
              >
                {t('common.done')}
              </button>
            </div>

            <StatusControl status={status} onChange={changeStatus} />
            {entry.ranges && entry.ranges.length > 0 && (
              <p className="mt-2 text-xs text-muted">
                {t('detail.ayahProgress', {
                  done: getMemorizedAyahCount(entry, surah.ayahs.length),
                  total: surah.ayahs.length,
                })}
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => toggleSetting('mushafView')}
                aria-pressed={settings.mushafView}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                  settings.mushafView
                    ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                    : 'text-muted ring-1 ring-emerald/10'
                }`}
              >
                {t('detail.mushafView')}
              </button>
              {/* Translation/tafsir display and the ayah-range picker are
                  list-view-specific — a real mushaf page has no translation,
                  and highlighting a tap-to-select range across flowing,
                  multi-line pages isn't supported yet (see MushafView.jsx). */}
              {!settings.mushafView && (
                <>
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
                  <button
                    type="button"
                    onClick={() => {
                      setMoreOpen(false)
                      toggleAyahRangeMode()
                    }}
                    aria-pressed={ayahRangeMode || hasCommittedAyahRange}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                      ayahRangeMode || hasCommittedAyahRange
                        ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                        : 'text-muted ring-1 ring-emerald/10'
                    }`}
                  >
                    {t('ayahRange.mark')}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {mushafSelectedAyah != null && surah && (
        <div
          className="fixed inset-0 z-30 flex items-end bg-black/30"
          onClick={() => setMushafSelectedAyah(null)}
        >
          <div
            className="mx-auto w-full max-w-2xl rounded-t-2xl bg-paper p-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-emerald">
                {t('ayahRange.labelSingle', { n: mushafSelectedAyah })}
              </p>
              <button
                type="button"
                onClick={() => setMushafSelectedAyah(null)}
                className="text-xs font-medium text-muted"
              >
                {t('common.done')}
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => mushafSelectedIndex >= 0 && toggleAyahPlay(mushafSelectedIndex)}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald text-paper transition active:scale-90"
                aria-label={
                  playing?.kind === 'ayah' && playing.index === mushafSelectedIndex
                    ? t('audio.pause')
                    : t('audio.play')
                }
              >
                {loadingAudio && playing?.kind === 'ayah' && playing.index === mushafSelectedIndex ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
                ) : playing?.kind === 'ayah' && playing.index === mushafSelectedIndex ? (
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
              <button
                type="button"
                onClick={() => toggleBookmarkAt(mushafSelectedAyah)}
                aria-pressed={bookmarkedSet.has(mushafSelectedAyah)}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition active:scale-90 ${
                  bookmarkedSet.has(mushafSelectedAyah)
                    ? 'bg-amber text-paper'
                    : 'text-muted ring-1 ring-emerald/15'
                }`}
                aria-label={bookmarkedSet.has(mushafSelectedAyah) ? t('bookmark.remove') : t('bookmark.add')}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill={bookmarkedSet.has(mushafSelectedAyah) ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z" />
                </svg>
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMushafAyahStatus(s)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${STATUS_STYLE[s].active}`}
                >
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
