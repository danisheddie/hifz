// A collapsible tadabbur (reflection) notes editor for a surah. Collapsed by
// default unless notes already exist; autosaves quietly after a short pause.

import { useEffect, useRef, useState } from 'react'
import { getSurahNotes, setSurahNotes } from '../utils/storage'
import { schedulePush } from '../utils/cloudSync'
import { useLang } from '../utils/i18n.jsx'

export default function NotesEditor({ surahNumber }) {
  const { t } = useLang()
  const [notes, setNotes] = useState(() => getSurahNotes(surahNumber))
  const [open, setOpen] = useState(() => !!getSurahNotes(surahNumber))
  const saveTimer = useRef(null)

  // Reload when navigating between surahs (component instance is reused).
  useEffect(() => {
    const initial = getSurahNotes(surahNumber)
    setNotes(initial)
    setOpen(!!initial)
  }, [surahNumber])

  function onChange(value) {
    setNotes(value)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      setSurahNotes(surahNumber, value)
      schedulePush()
    }, 400)
  }

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  return (
    <div className="border-b border-emerald/5 px-5 py-3">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-sm font-medium text-emerald"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          aria-hidden="true"
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
        {t('notes.title')}
        {!open && notes && <span className="h-1.5 w-1.5 rounded-full bg-amber" />}
      </button>

      {open && (
        <textarea
          value={notes}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('notes.placeholder')}
          rows={4}
          className="mt-3 w-full resize-none rounded-xl border border-emerald/15 bg-transparent px-3.5 py-3 text-sm leading-relaxed text-emerald placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-emerald/20"
        />
      )}
    </div>
  )
}
