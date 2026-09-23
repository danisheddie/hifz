// Renders the real printed-mushaf page layout for the pages a surah's ayat
// span: justified 15-line pages in the exact QCF v2 per-page glyphs when
// loaded, falling back to a flowing KFGQPC paragraph per page otherwise —
// same graceful-degradation AyahCard already uses. Ayat belonging to the
// surah being read are tappable (calls onSelectAyah); ayat from a
// neighbouring surah sharing a boundary page render dimmed and inert.
//
// Deliberately out of scope here: the loop-range and "mark ayat" range
// pickers (SurahDetail's tap-two-ayat flow) — highlighting an arbitrary
// span across flowing, multi-line pages is a materially bigger feature.
// Switch back to list view for range actions; mushaf view only offers
// single-ayah actions via the tap sheet.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { getMushafPage, attachAyahInfo } from '../utils/api'
import { useLang } from '../utils/i18n.jsx'
import { BASE_ARABIC_REM } from './AyahCard'
import LoadingSpinner from './LoadingSpinner'

function toArabicNumber(n) {
  const map = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']
  return String(n)
    .split('')
    .map((d) => map[Number(d)] ?? d)
    .join('')
}

function wordClass(w, surahNumber, selectedAyah) {
  const tappable = w.surah === surahNumber
  const selected = tappable && w.ayah === selectedAyah
  return [
    w.end ? 'text-amber' : tappable ? 'text-emerald' : 'text-emerald/40',
    selected ? 'rounded bg-amber/15' : '',
  ]
    .filter(Boolean)
    .join(' ')
}

// A physical mushaf line's word count varies a lot page to page, but the
// QCF glyphs for a line are only guaranteed to fit the screen at *some*
// font size — never a single fixed one, on any device. Rather than pick a
// magic px value that overflows on dense lines (the bug this replaced:
// text clipped at both edges, page unreadable), this renders at the
// desired size, measures its own natural width against the space it
// actually has, and — only if it doesn't fit — shrinks the font-size by
// that exact ratio. Text width scales linearly with font-size for fixed
// content, so one measurement is enough; no iterative re-measuring.
function JustifiedLine({ words, page, desiredPx, surahNumber, selectedAyah, onSelectAyah }) {
  const wrapRef = useRef(null)
  const rowRef = useRef(null)
  const [fontSize, setFontSize] = useState(desiredPx)
  const fittedForRef = useRef(null)

  useLayoutEffect(() => {
    if (fittedForRef.current === desiredPx) return
    const wrap = wrapRef.current
    const row = rowRef.current
    if (!wrap || !row) return
    const availWidth = wrap.clientWidth
    const naturalWidth = row.scrollWidth
    setFontSize(
      availWidth > 0 && naturalWidth > availWidth ? desiredPx * (availWidth / naturalWidth) : desiredPx
    )
    fittedForRef.current = desiredPx
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [desiredPx, words])

  return (
    <div ref={wrapRef} className="w-full overflow-hidden">
      <div
        ref={rowRef}
        dir="rtl"
        className="flex justify-between whitespace-nowrap"
        style={{ fontSize: `${fontSize}px`, lineHeight: 2.2 }}
      >
        {words.map((w, i) => (
          <span
            key={i}
            onClick={w.surah === surahNumber ? () => onSelectAyah(w.ayah) : undefined}
            style={{ fontFamily: `qcf2p${page}` }}
            className={wordClass(w, surahNumber, selectedAyah)}
          >
            {w.code}
          </span>
        ))}
      </div>
    </div>
  )
}

function GlyphPage({ page, data, scale, surahNumber, selectedAyah, onSelectAyah }) {
  const lines = useMemo(() => attachAyahInfo(data), [data])
  const desiredPx = BASE_ARABIC_REM * scale * 16
  return (
    <>
      {lines.map((line) => (
        <JustifiedLine
          key={line.lineNumber}
          words={line.words}
          page={page}
          desiredPx={desiredPx}
          surahNumber={surahNumber}
          selectedAyah={selectedAyah}
          onSelectAyah={onSelectAyah}
        />
      ))}
    </>
  )
}

function FallbackPage({ data, scale, surahNumber, selectedAyah, onSelectAyah }) {
  return (
    <p
      dir="rtl"
      lang="ar"
      className="font-quran leading-[2.3] text-emerald"
      style={{ fontSize: `${BASE_ARABIC_REM * scale}rem` }}
    >
      {data.verses.map((v) => {
        const tappable = v.surah === surahNumber
        const selected = tappable && v.ayah === selectedAyah
        return (
          <span
            key={v.num}
            onClick={tappable ? () => onSelectAyah(v.ayah) : undefined}
            className={[
              tappable ? '' : 'text-emerald/40',
              selected ? 'rounded bg-amber/15' : '',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            {v.text}{' '}
            <span className="font-arabic text-amber text-xl mx-1.5">﴿{toArabicNumber(v.ayah)}﴾</span>{' '}
          </span>
        )
      })}
    </p>
  )
}

export default function MushafView({ pages, glyphPages, surahNumber, scale, selectedAyah, onSelectAyah }) {
  const { t } = useLang()
  const [pagesData, setPagesData] = useState({})

  useEffect(() => {
    let cancelled = false
    for (const page of pages) {
      getMushafPage(page)
        .then((data) => {
          if (!cancelled) setPagesData((prev) => ({ ...prev, [page]: data }))
        })
        .catch(() => {
          if (!cancelled) setPagesData((prev) => ({ ...prev, [page]: 'error' }))
        })
    }
    return () => {
      cancelled = true
    }
  }, [pages])

  return (
    <div>
      {pages.map((page) => {
        const data = pagesData[page]
        return (
          <div key={page} className="mb-10">
            {!data && <LoadingSpinner />}
            {data === 'error' && (
              <p className="py-8 text-center text-sm text-muted">{t('detail.unable')}</p>
            )}
            {data && data !== 'error' && (
              <>
                {glyphPages.has(page) ? (
                  <GlyphPage
                    page={page}
                    data={data}
                    scale={scale}
                    surahNumber={surahNumber}
                    selectedAyah={selectedAyah}
                    onSelectAyah={onSelectAyah}
                  />
                ) : (
                  <FallbackPage
                    data={data}
                    scale={scale}
                    surahNumber={surahNumber}
                    selectedAyah={selectedAyah}
                    onSelectAyah={onSelectAyah}
                  />
                )}
                <p className="mt-3 text-center text-xs text-muted">
                  {t('mushaf.pageLabel', { n: page })}
                </p>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
