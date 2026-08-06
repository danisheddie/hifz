// A calm, dismissible nudge to add the app to the Home Screen — an installed
// PWA is the fuller experience this app is built for (offline, full-screen,
// no browser chrome). Platform-smart: a one-tap Install button where the
// browser supports it (Android/desktop Chrome/Edge), step-by-step on iOS.

import { useState } from 'react'
import { useInstall } from '../utils/useInstall.jsx'
import { useLang } from '../utils/i18n.jsx'

export default function InstallPrompt() {
  const { t } = useLang()
  const { eligible, deferred, iosNeedsBrowser, install, dontShowAgain } = useInstall()
  const [closed, setClosed] = useState(false)

  if (!eligible || closed) return null

  return (
    <div className="mt-4 rounded-2xl border border-emerald/20 bg-emerald/[0.05] px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-emerald">{t('install.title')}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-muted">
            {t('install.body')}
          </p>
          {deferred ? (
            <button
              onClick={install}
              className="mt-2 rounded-xl bg-emerald px-4 py-1.5 text-xs font-semibold text-paper transition active:scale-[0.98]"
            >
              {t('install.button')}
            </button>
          ) : (
            <p className="mt-2 text-xs font-medium text-emerald">
              {iosNeedsBrowser ? t('install.iosOpenBrowser') : t('install.iosSteps')}
            </p>
          )}
        </div>
        <button
          onClick={() => setClosed(true)}
          aria-label="Close"
          className="-mr-1 -mt-1 shrink-0 rounded-full p-1 text-muted transition active:scale-90"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <button
        onClick={dontShowAgain}
        className="mt-2 text-[11px] text-muted/80 underline-offset-2 hover:underline"
      >
        {t('install.dontShow')}
      </button>
    </div>
  )
}
