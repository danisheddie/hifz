// Optional cloud sync via a "sync code" (or Google sign-in) — a passphrase
// that identifies an account record on the backend. Local-first: the app
// works fully offline and only talks to the server when the user opts into
// sync. The code itself is the credential, so it's generated with enough
// entropy to be unguessable.
//
// All network calls no-op when the backend isn't configured (config.js empty).

import { WORKER_URL, googleAuthConfigured } from '../config'

// localStorage keys that make up a syncable snapshot. Device-specific keys
// (the sync code/session themselves) are deliberately excluded.
export const SYNC_KEYS = ['hifz:settings', 'hifz:surahStatus', 'hifz:userName', 'hifz:bookmarks']

const CODE_KEY = 'hifz:syncCode'
const GTOKEN_KEY = 'hifz:gToken'
const GPROFILE_KEY = 'hifz:gProfile'
// Unambiguous alphabet (no 0/O/1/I) for readable codes like ABCD-EFGH-JKLM.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const syncConfigured = () => Boolean(WORKER_URL)
export const googleConfigured = () => googleAuthConfigured()

export function generateSyncCode() {
  const bytes = new Uint8Array(12)
  ;(globalThis.crypto || crypto).getRandomValues(bytes)
  let s = ''
  for (let i = 0; i < bytes.length; i++) {
    if (i > 0 && i % 4 === 0) s += '-'
    s += ALPHABET[bytes[i] % ALPHABET.length]
  }
  return s // e.g. ABCD-EFGH-JKLM
}

export function normalizeCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

// --- snapshot read/write (touch localStorage) ------------------------------
export function exportSnapshot() {
  const snap = { _updatedAt: Date.now() }
  for (const key of SYNC_KEYS) {
    const raw = localStorage.getItem(key)
    if (raw !== null) {
      try {
        snap[key] = JSON.parse(raw)
      } catch {
        snap[key] = raw
      }
    }
  }
  return snap
}

export function applySnapshot(snap) {
  if (!snap) return
  for (const key of SYNC_KEYS) {
    if (key in snap) {
      try {
        localStorage.setItem(key, JSON.stringify(snap[key]))
      } catch {
        /* ignore */
      }
    }
  }
}

export function getSyncCode() {
  try {
    return localStorage.getItem(CODE_KEY) || null
  } catch {
    return null
  }
}
export function setSyncCode(code) {
  try {
    localStorage.setItem(CODE_KEY, code)
  } catch {
    /* ignore */
  }
}
export function clearSyncCode() {
  try {
    localStorage.removeItem(CODE_KEY)
  } catch {
    /* ignore */
  }
}

// --- Google session --------------------------------------------------------
export function getGoogleToken() {
  try {
    return localStorage.getItem(GTOKEN_KEY) || null
  } catch {
    return null
  }
}
export function getGoogleProfile() {
  try {
    const raw = localStorage.getItem(GPROFILE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}
export function setGoogleSession(token, profile) {
  try {
    localStorage.setItem(GTOKEN_KEY, token)
    localStorage.setItem(GPROFILE_KEY, JSON.stringify(profile || {}))
  } catch {
    /* ignore */
  }
}
export function clearGoogleSession() {
  try {
    localStorage.removeItem(GTOKEN_KEY)
    localStorage.removeItem(GPROFILE_KEY)
  } catch {
    /* ignore */
  }
}
export const isGoogleSignedIn = () => Boolean(getGoogleToken())

// The active credential for sync: a Google session takes precedence over a
// sync code when both are present.
function activeCredential() {
  const token = getGoogleToken()
  if (token) return { token }
  const code = getSyncCode()
  if (code) return { code: normalizeCode(code) }
  return null
}

// --- merge (pure) ----------------------------------------------------------
// Combine two snapshots without losing progress. Unlike a linear "furthest
// page reached" model, a surah's status isn't strictly ordered (memorizing
// vs. revision aren't comparable), so surahStatus merges per surah number by
// last-write-wins by `updatedAt` — whichever device touched that surah more
// recently keeps it. Settings follow the snapshot edited most recently.
function mergeSurahStatus(a = {}, b = {}) {
  const out = {}
  const numbers = new Set([...Object.keys(a), ...Object.keys(b)])
  for (const n of numbers) {
    const x = a[n]
    const y = b[n]
    if (!x) out[n] = y
    else if (!y) out[n] = x
    else {
      const xT = Date.parse(x.updatedAt || x.lastRevised || 0) || 0
      const yT = Date.parse(y.updatedAt || y.lastRevised || 0) || 0
      out[n] = yT >= xT ? y : x
    }
  }
  return out
}

// Union of both devices' bookmarks, deduped by surah+ayah (keep whichever
// side saw it first) — a bookmark isn't the kind of thing that needs
// last-write-wins, unlike a status that can genuinely change.
function mergeBookmarks(a = [], b = []) {
  const map = new Map()
  for (const item of [...a, ...b]) {
    const key = `${item.surah}:${item.ayah}`
    if (!map.has(key)) map.set(key, item)
  }
  return [...map.values()]
}

export function mergeSnapshots(a = {}, b = {}) {
  const aT = a._updatedAt || 0
  const bT = b._updatedAt || 0
  const newer = bT >= aT ? b : a

  // Name: prefer a non-empty value; newer wins if both sides have one.
  const aName = a['hifz:userName'] || ''
  const bName = b['hifz:userName'] || ''
  const name = aName && bName ? newer['hifz:userName'] : aName || bName

  return {
    'hifz:settings': newer['hifz:settings'] ?? a['hifz:settings'] ?? b['hifz:settings'],
    'hifz:surahStatus': mergeSurahStatus(a['hifz:surahStatus'], b['hifz:surahStatus']),
    'hifz:userName': name,
    'hifz:bookmarks': mergeBookmarks(a['hifz:bookmarks'], b['hifz:bookmarks']),
    _updatedAt: Math.max(aT, bT),
  }
}

// --- network -----------------------------------------------------------
async function call(path, body) {
  const res = await fetch(`${WORKER_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`sync ${path} failed (${res.status})`)
  return res.json().catch(() => ({}))
}

export async function pullSnapshot(code) {
  if (!syncConfigured()) return null
  const r = await call('/sync/pull', { code: normalizeCode(code) })
  return r && r.data ? r.data : null
}

export async function pushSnapshot(code, snapshot) {
  if (!syncConfigured()) return
  await call('/sync/push', { code: normalizeCode(code), data: snapshot })
}

// Credential-agnostic pull/push (accepts { token } or { code }).
async function pullWith(cred) {
  if (!syncConfigured() || !cred) return null
  const r = await call('/sync/pull', cred)
  return r && r.data ? r.data : null
}
async function pushWith(cred, snapshot) {
  if (!syncConfigured() || !cred) return
  await call('/sync/push', { ...cred, data: snapshot })
}

// --- Google sign-in --------------------------------------------------------
// Exchange a Google ID token for a durable session, then merge + sync. Called
// with the credential string from Google Identity Services.
export async function googleSignIn(idToken) {
  if (!syncConfigured()) throw new Error('Sync service isn’t set up yet.')
  const r = await call('/auth/google', { idToken })
  if (!r || !r.token) throw new Error('Sign-in failed. Please try again.')
  setGoogleSession(r.token, r.profile)
  const merged = mergeSnapshots(exportSnapshot(), r.data || {})
  applySnapshot(merged)
  await pushWith({ token: r.token }, merged)
  return r.profile
}

export async function googleSignOut() {
  const token = getGoogleToken()
  if (token) {
    try {
      await call('/auth/signout', { token })
    } catch {
      /* best effort */
    }
  }
  clearGoogleSession()
}

// Create a brand-new account: generate a code, push the current local data.
export async function createAccount() {
  const code = generateSyncCode()
  await pushSnapshot(code, exportSnapshot())
  setSyncCode(code)
  return code
}

// Link this device to an existing code: pull remote, merge with local, apply,
// push the merged result back, and remember the code.
export async function linkAccount(code) {
  const clean = normalizeCode(code)
  if (clean.length < 8) throw new Error('That code looks too short.')
  const remote = await pullSnapshot(clean)
  if (remote === null) throw new Error("We couldn't find that sync code.")
  const merged = mergeSnapshots(exportSnapshot(), remote)
  applySnapshot(merged)
  await pushSnapshot(clean, merged)
  setSyncCode(clean)
  return merged
}

// Pull + merge + apply + push for the currently linked code. Quietly does
// nothing when not linked or not configured.
let pushTimer = null
export async function syncNow() {
  const cred = activeCredential()
  if (!cred || !syncConfigured()) return null
  const remote = await pullWith(cred)
  const merged = mergeSnapshots(exportSnapshot(), remote || {})
  applySnapshot(merged)
  await pushWith(cred, merged)
  return merged
}

// Debounced push of local state after a change (e.g. a status update).
export function schedulePush() {
  const cred = activeCredential()
  if (!cred || !syncConfigured()) return
  clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    pushWith(cred, exportSnapshot()).catch(() => {})
  }, 2500)
}
