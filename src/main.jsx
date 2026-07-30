import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import { LanguageProvider } from './utils/i18n.jsx'
import { getSettings } from './utils/storage'
import { applyTheme } from './utils/theme'
import './index.css'

// Sync the theme (and the browser UI colour) with the saved preference. The
// data-theme attribute is also set pre-paint by an inline script in index.html.
applyTheme(getSettings().theme)

// Guarantee the official KFGQPC Uthmanic Hafs font is registered on every
// device (with the correct base path), so silent-letter marks like the ṣifr
// mustadīr over a silent alif render as a proper circle — not a fallback dot.
if (typeof FontFace !== 'undefined' && document.fonts) {
  const kfgqpc = new FontFace(
    'KFGQPC Uthmanic Script HAFS',
    `url(${import.meta.env.BASE_URL}fonts/UthmanicHafs1Ver18.woff2)`,
    { display: 'swap' }
  )
  kfgqpc
    .load()
    .then((face) => document.fonts.add(face))
    .catch(() => {})
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* basename matches Vite's base so routes work under the app's base. */}
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </BrowserRouter>
  </React.StrictMode>
)

// Register the service worker (PWA install + offline caching). Harmless if the
// browser lacks support; failures are non-fatal.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, {
        scope: import.meta.env.BASE_URL,
      })
      .catch(() => {})
  })
}

// Ask the browser not to evict the offline Qur'an data cache under storage
// pressure. Best-effort — silently ignored where unsupported or declined.
navigator.storage?.persist?.().catch(() => {})
