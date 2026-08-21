// App-wide preferences, grouped into categories (Reading, Appearance, Sync)
// with tap-to-expand rows — the "Profile" tab in BottomNav. Each row shows
// its current value when collapsed so the screen reads at a glance without
// opening anything.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSettings, setSetting, getName, setName as saveName } from '../utils/storage'
import { RECITERS, TRANSLATIONS } from '../utils/api'
import { applyTheme } from '../utils/theme'
import { LANGUAGES, useLang } from '../utils/i18n.jsx'
import { schedulePush } from '../utils/cloudSync'
import BackButton from './BackButton'
import SyncSettings from './SyncSettings'
import BottomNav from './BottomNav'

const THEMES = ['light', 'dark', 'sepia']

function SettingsRow({ label, value, expanded, onToggle, children }) {
  return (
    <div className="border-b border-emerald/5 py-3">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="text-sm font-medium text-emerald">{label}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
          {!expanded && <span className="max-w-[140px] truncate">{value}</span>}
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className={`shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}
            aria-hidden="true"
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </span>
      </button>
      {expanded && <div className="mt-3">{children}</div>}
    </div>
  )
}

export default function Settings() {
  const navigate = useNavigate()
  const { t, lang, setLang } = useLang()
  const [settings, setSettings] = useState(() => getSettings())
  const [name, setName] = useState(() => getName())
  const [openRow, setOpenRow] = useState(null)

  function changeTheme(theme) {
    setSettings(setSetting('theme', theme))
    applyTheme(theme)
  }

  function changeName(value) {
    setName(value)
    saveName(value)
    schedulePush()
  }

  function toggleRow(id) {
    setOpenRow((prev) => (prev === id ? null : id))
  }

  const languageName = LANGUAGES.find((l) => l.id === lang)?.name ?? lang
  const translationName = TRANSLATIONS.find((tr) => tr.id === settings.translationEdition)?.name ?? ''
  const reciterName = RECITERS.find((r) => r.id === settings.reciter)?.name ?? ''

  return (
    <div className="mx-auto flex h-screen max-w-2xl flex-col">
      <div className="flex-1 overflow-y-auto">
        <header className="sticky top-0 z-10 flex items-center gap-2 border-b border-emerald/5 bg-paper/90 px-5 py-4 backdrop-blur">
          <BackButton onClick={() => navigate('/')} />
          <h1 className="text-lg font-semibold text-emerald">{t('settings.title')}</h1>
        </header>

        <main className="px-5 pb-16 pt-4">
          <section>
            <h2 className="text-sm font-semibold text-emerald">{t('settings.yourName')}</h2>
            <input
              type="text"
              value={name}
              onChange={(e) => changeName(e.target.value)}
              maxLength={40}
              className="mt-2 w-full rounded-xl border border-emerald/15 bg-transparent px-4 py-2.5 text-sm text-emerald outline-none transition placeholder:text-muted/60 focus:border-emerald"
            />
          </section>

          <section className="mt-8">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('settings.category.reading')}
            </h2>
            <SettingsRow
              label={t('settings.translation')}
              value={translationName}
              expanded={openRow === 'translation'}
              onToggle={() => toggleRow('translation')}
            >
              <select
                value={settings.translationEdition}
                onChange={(e) => setSettings(setSetting('translationEdition', e.target.value))}
                className="w-full rounded-xl border border-emerald/15 bg-transparent px-4 py-2.5 text-sm text-emerald outline-none transition focus:border-emerald"
              >
                {TRANSLATIONS.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.name}
                  </option>
                ))}
              </select>
            </SettingsRow>
            <SettingsRow
              label={t('settings.reciter')}
              value={reciterName}
              expanded={openRow === 'reciter'}
              onToggle={() => toggleRow('reciter')}
            >
              <select
                value={settings.reciter}
                onChange={(e) => setSettings(setSetting('reciter', e.target.value))}
                className="w-full rounded-xl border border-emerald/15 bg-transparent px-4 py-2.5 text-sm text-emerald outline-none transition focus:border-emerald"
              >
                {RECITERS.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </SettingsRow>
          </section>

          <section className="mt-8">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('settings.category.appearance')}
            </h2>
            <SettingsRow
              label={t('settings.language')}
              value={languageName}
              expanded={openRow === 'language'}
              onToggle={() => toggleRow('language')}
            >
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setLang(l.id)}
                    aria-pressed={lang === l.id}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                      lang === l.id
                        ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                        : 'text-muted ring-1 ring-emerald/10'
                    }`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            </SettingsRow>
            <SettingsRow
              label={t('settings.theme')}
              value={t(`settings.theme.${settings.theme}`)}
              expanded={openRow === 'theme'}
              onToggle={() => toggleRow('theme')}
            >
              <div className="flex flex-wrap gap-2">
                {THEMES.map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => changeTheme(th)}
                    aria-pressed={settings.theme === th}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition active:scale-95 ${
                      settings.theme === th
                        ? 'bg-amber/15 text-amber ring-1 ring-amber/40'
                        : 'text-muted ring-1 ring-emerald/10'
                    }`}
                  >
                    {t(`settings.theme.${th}`)}
                  </button>
                ))}
              </div>
            </SettingsRow>
          </section>

          <section className="mt-8">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted">
              {t('settings.category.sync')}
            </h2>
            <div className="mt-3">
              <SyncSettings />
            </div>
          </section>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
