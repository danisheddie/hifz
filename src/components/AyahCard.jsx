// Renders a single ayah: a play button, Arabic (RTL, exact mushaf glyphs when
// loaded), an optional translation, and an optional expandable tafsir. In
// "test yourself" mode the Arabic (and translation) stay hidden until tapped,
// for recall practice. Kept visually calm, like a printed mushaf.

import { useState } from 'react'
import { getTafsir } from '../utils/tafsir'
import { useLang } from '../utils/i18n.jsx'
import AudioPlayer from './AudioPlayer'

// Arabic-Indic numerals for the in-text ayah marker.
function toArabicNumber(n) {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return String(n)
    .split('')
    .map((d) => map[Number(d)] ?? d)
    .join('')
}

const ARABIC_SIZE = {
  s: 'text-2xl sm:text-3xl',
  m: 'text-3xl sm:text-4xl',
  l: 'text-4xl sm:text-5xl',
}

export default function AyahCard({
  ayah,
  showTranslation,
  showTafsirToggle,
  glyphs,
  size = 'm',
  isPlaying,
  isLoadingAudio,
  onTogglePlay,
  testMode = 'off', // 'off' | 'hide' | 'firstWord'
  rangeSelectable,
  inRange,
  rangeEndpoint, // 'start' | 'end' | null — which end of the range this ayah is
  onSelectRange,
}) {
  const { t } = useLang()
  const arabicSize = ARABIC_SIZE[size] || ARABIC_SIZE.m
  const [tafsirState, setTafsirState] = useState('closed') // closed | loading | open | error
  const [tafsir, setTafsir] = useState(null)
  const [revealed, setRevealed] = useState(false)

  function toggleTafsir() {
    if (tafsirState === 'open' || tafsirState === 'error') {
      setTafsirState('closed')
      return
    }
    if (tafsirState === 'loading') return
    if (tafsir) {
      setTafsirState('open')
      return
    }
    setTafsirState('loading')
    getTafsir(`${ayah.surahNumber}:${ayah.numberInSurah}`)
      .then((result) => {
        setTafsir(result)
        setTafsirState('open')
      })
      .catch(() => setTafsirState('error'))
  }

  function onArabicTap() {
    if (rangeSelectable) onSelectRange()
    else if (testMode !== 'off') setRevealed((r) => !r)
  }

  const hidden = testMode !== 'off' && !revealed
  const tappable = rangeSelectable || testMode !== 'off'

  return (
    <article
      className={`border-b border-emerald/5 py-6 last:border-b-0 transition-colors ${
        isPlaying ? 'bg-amber/5' : inRange ? 'bg-emerald/5' : ''
      }`}
    >
      <div className="flex items-start gap-3">
        <AudioPlayer
          isPlaying={!!isPlaying}
          isLoading={!!isLoadingAudio}
          disabled={!onTogglePlay}
          onToggle={onTogglePlay}
        />

        <div
          className={`min-w-0 grow ${tappable ? 'cursor-pointer' : ''}`}
          onClick={tappable ? onArabicTap : undefined}
          role={tappable ? 'button' : undefined}
          tabIndex={tappable ? 0 : undefined}
        >
          {rangeEndpoint && (
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-amber">
              {rangeEndpoint === 'start' ? t('audio.rangeStart') : t('audio.rangeEnd')}
            </p>
          )}

          {hidden ? (
            <p className="flex items-center gap-2 py-2 text-sm text-muted" dir="rtl">
              {testMode === 'firstWord' && (
                <span className={`font-quran text-emerald ${arabicSize}`} dir="rtl" lang="ar">
                  {glyphs ? (
                    <span style={{ fontFamily: `qcf2p${ayah.words[0].page}` }}>
                      {ayah.words[0].code}
                    </span>
                  ) : (
                    ayah.arabic.split(/\s+/)[0]
                  )}
                  {' …'}
                </span>
              )}
              <span className="italic">{t('test.tapToReveal')}</span>
            </p>
          ) : glyphs ? (
            // Exact mushaf rendering: each word in its QCF v2 page glyph; the
            // ayah-end word carries the ornate number, shown in amber.
            <p dir="rtl" lang="ar" className={`leading-[2.5] text-emerald ${arabicSize}`}>
              {ayah.words.map((w, i) => (
                <span
                  key={i}
                  style={{ fontFamily: `qcf2p${w.page}` }}
                  className={w.end ? 'text-amber' : undefined}
                >
                  {w.code}
                  {i < ayah.words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </p>
          ) : (
            <p dir="rtl" lang="ar" className={`font-quran leading-[2.3] text-emerald ${arabicSize}`}>
              {ayah.arabic}{' '}
              <span className="font-arabic text-amber text-xl mx-1.5">
                ﴿{toArabicNumber(ayah.numberInSurah)}﴾
              </span>
            </p>
          )}

          {showTranslation && ayah.translation && !hidden && (
            <p className="mt-3 text-[15px] leading-relaxed text-muted">
              <span className="mr-1 font-semibold text-amber">{ayah.numberInSurah}.</span>
              {ayah.translation}
            </p>
          )}

          {showTafsirToggle && !hidden && (
            <div className="mt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleTafsir()
                }}
                className="text-xs font-medium text-emerald/70 underline decoration-emerald/30 underline-offset-2 transition active:scale-95"
              >
                {tafsirState === 'loading' ? t('tafsir.loading') : t('tafsir.toggle')}
              </button>

              {tafsirState === 'error' && (
                <p className="mt-2 text-xs text-muted">{t('tafsir.unable')}</p>
              )}

              {tafsirState === 'open' && tafsir && (
                <p className="mt-2 rounded-xl bg-emerald/5 px-3.5 py-3 text-sm leading-relaxed text-muted">
                  {tafsir.text}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
