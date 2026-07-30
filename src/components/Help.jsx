// A short, calm guide to the app's features — an accordion of tips rather
// than a guided tour overlay, so it stays simple to build and skim.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLang } from '../utils/i18n.jsx'
import BackButton from './BackButton'

const SECTIONS = [
  'gettingStarted',
  'status',
  'ayahRange',
  'bookmarks',
  'audio',
  'testYourself',
  'notesTafsir',
  'revision',
  'sync',
]

function HelpSection({ id, t, open, onToggle }) {
  return (
    <div className="border-b border-emerald/5 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-2 text-left text-sm font-medium text-emerald"
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
        {t(`help.section.${id}.title`)}
      </button>
      {open && (
        <p className="mt-2 pl-[22px] text-sm leading-relaxed text-muted">
          {t(`help.section.${id}.body`)}
        </p>
      )}
    </div>
  )
}

export default function Help() {
  const { t } = useLang()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState(SECTIONS[0])

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
      <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
        <BackButton onClick={() => navigate(-1)} />
        <h1 className="text-lg font-semibold text-emerald">{t('help.title')}</h1>
      </header>

      <main className="px-5 pb-16 pt-4">
        <p className="mb-2 text-sm text-muted">{t('help.intro')}</p>
        {SECTIONS.map((id) => (
          <HelpSection
            key={id}
            id={id}
            t={t}
            open={openId === id}
            onToggle={() => setOpenId((prev) => (prev === id ? null : id))}
          />
        ))}
      </main>
    </div>
  )
}
