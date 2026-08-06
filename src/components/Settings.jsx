// App-wide preferences: language, theme, and optional cloud sync. The first
// UI surface for appLang/theme, which previously lived in storage with no
// picker.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getSettings, setSetting, getName, setName as saveName } from '../utils/storage'
import { RECITERS } from '../utils/api'
import { applyTheme } from '../utils/theme'
import { LANGUAGES, useLang } from '../utils/i18n.jsx'
import { schedulePush } from '../utils/cloudSync'
import BackButton from './BackButton'
import SyncSettings from './SyncSettings'

const THEMES = ['light', 'dark', 'sepia']

export default function Settings() {
  const navigate = useNavigate()
  const { t, lang, setLang } = useLang()
  const [settings, setSettings] = useState(() => getSettings())
  const [name, setName] = useState(() => getName())

  function changeTheme(theme) {
    setSettings(setSetting('theme', theme))
    applyTheme(theme)
  }

  function changeName(value) {
    setName(value)
    saveName(value)
    schedulePush()
  }

  return (
    <div className="mx-auto h-screen max-w-2xl overflow-y-auto">
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
          <h2 className="text-sm font-semibold text-emerald">{t('settings.language')}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
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
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-emerald">{t('settings.theme')}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
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
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-emerald">{t('settings.reciter')}</h2>
          <select
            value={settings.reciter}
            onChange={(e) => setSettings(setSetting('reciter', e.target.value))}
            className="mt-2 w-full rounded-xl border border-emerald/15 bg-transparent px-4 py-2.5 text-sm text-emerald outline-none transition focus:border-emerald"
          >
            {RECITERS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-semibold text-emerald">{t('sync.title')}</h2>
          <div className="mt-3">
            <SyncSettings />
          </div>
        </section>
      </main>
    </div>
  )
}
