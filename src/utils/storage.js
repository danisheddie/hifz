// All localStorage read/write logic for Hifz lives here. Keeping it in one
// place keeps components free of storage details.

const KEYS = {
  settings: 'hifz:settings',
}

export const DEFAULT_SETTINGS = {
  // App UI language: 'en' | 'ms' | 'id'.
  appLang: 'en',
  // Theme: 'light' | 'dark' | 'sepia'.
  theme: 'light',
  // Arabic reading size: 's' | 'm' | 'l'.
  readingSize: 'm',
  showTranslation: true,
  translationEdition: 'en.asad',
}

function read(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or unavailable — fail quietly */
  }
}

export function getSettings() {
  return { ...DEFAULT_SETTINGS, ...read(KEYS.settings, {}) }
}

export function setSetting(key, value) {
  const next = { ...getSettings(), [key]: value }
  write(KEYS.settings, next)
  return next
}
