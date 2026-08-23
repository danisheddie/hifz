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

import { useEffect, useState } from 'react'
import { getMushafPage, attachAyahInfo } from '../utils/api'
import { useLang } from '../utils/i18n.jsx'
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

function GlyphPage({ page, data, surahNumber, selectedAyah, onSelectAyah }) {
  const lines = attachAyahInfo(data)
  return (
    <>
      {lines.map((line) => (
        <div key={line.lineNumber} dir="rtl" className="flex justify-between text-3xl leading-[2.2]">
          {line.words.map((w, i) => (
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
      ))}
    </>
  )
}

function FallbackPage({ data, surahNumber, selectedAyah, onSelectAyah }) {
  return (
    <p dir="rtl" lang="ar" className="font-quran text-3xl leading-[2.3] text-emerald">
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

export default function MushafView({ pages, glyphPages, surahNumber, selectedAyah, onSelectAyah }) {
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
                    surahNumber={surahNumber}
                    selectedAyah={selectedAyah}
                    onSelectAyah={onSelectAyah}
                  />
                ) : (
                  <FallbackPage
                    data={data}
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
