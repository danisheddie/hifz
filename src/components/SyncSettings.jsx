// "Back up & sync" settings: create or enter a sync code so progress (status,
// notes, settings) follows the user across devices. Local-first — the app
// works fully without ever turning this on.

import { useState } from 'react'
import {
  syncConfigured,
  googleConfigured,
  getSyncCode,
  clearSyncCode,
  createAccount,
  linkAccount,
  syncNow,
} from '../utils/cloudSync'
import GoogleSignIn from './GoogleSignIn'
import { useLang } from '../utils/i18n.jsx'

export default function SyncSettings() {
  const { t } = useLang()
  const [code, setCode] = useState(() => getSyncCode())
  const [entry, setEntry] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const configured = syncConfigured()

  async function create() {
    setError('')
    setNote('')
    setBusy(true)
    try {
      const c = await createAccount()
      setCode(c)
      setNote(t('sync.created'))
    } catch (e) {
      setError(e.message || t('sync.createFail'))
    } finally {
      setBusy(false)
    }
  }

  async function link() {
    setError('')
    setNote('')
    setBusy(true)
    try {
      await linkAccount(entry)
      setCode(getSyncCode())
      setEntry('')
      setNote(t('sync.restored'))
    } catch (e) {
      setError(e.message || t('sync.linkFail'))
    } finally {
      setBusy(false)
    }
  }

  async function refresh() {
    setError('')
    setNote('')
    setBusy(true)
    try {
      await syncNow()
      setNote(t('sync.synced'))
    } catch {
      setError(t('sync.syncFail'))
    } finally {
      setBusy(false)
    }
  }

  function unlink() {
    clearSyncCode()
    setCode(null)
    setNote(t('sync.stopped'))
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(code)
      setNote(t('sync.copied'))
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <p className="text-xs leading-relaxed text-muted">{t('sync.intro')}</p>

      {!configured && (
        <p className="mt-3 rounded-xl bg-amber/10 px-3 py-2 text-xs text-muted">
          {t('sync.notConnected')}
        </p>
      )}

      {/* Preferred: one-tap Google sign-in (shown when configured) */}
      <GoogleSignIn />

      {googleConfigured() && (
        <div className="mt-6 flex items-center gap-3 text-xs text-muted">
          <span className="h-px grow bg-emerald/10" />
          {t('sync.orUseCode')}
          <span className="h-px grow bg-emerald/10" />
        </div>
      )}

      {note && (
        <p className="mt-3 rounded-xl bg-emerald/5 px-3 py-2 text-xs text-emerald">{note}</p>
      )}
      {error && (
        <p className="mt-3 rounded-xl bg-clay/10 px-3 py-2 text-xs text-clay">{error}</p>
      )}

      {code ? (
        <div className="mt-4">
          <p className="text-xs text-muted">{t('sync.yourCode')}</p>
          <div className="mt-1 flex items-center justify-between gap-3 rounded-2xl border border-emerald/15 px-4 py-3">
            <span className="font-mono text-base tracking-wider text-emerald">{code}</span>
            <button className="text-xs font-medium text-amber" onClick={copy}>
              {t('sync.copy')}
            </button>
          </div>
          <p className="mt-2 text-xs text-muted">{t('sync.codeHint')}</p>
          <div className="mt-4 flex gap-3">
            <button className="btn-ghost flex-1 px-4 py-2 text-sm" disabled={busy} onClick={refresh}>
              {t('sync.syncNow')}
            </button>
            <button
              className="flex-1 rounded-2xl border border-emerald/15 px-4 py-2 text-sm text-muted"
              disabled={busy}
              onClick={unlink}
            >
              {t('sync.stop')}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <button
            className="w-full rounded-2xl bg-emerald px-4 py-3 text-sm font-medium text-paper disabled:opacity-40"
            disabled={busy || !configured}
            onClick={create}
          >
            {t('sync.createCode')}
          </button>

          <div>
            <label className="text-xs text-muted">{t('sync.haveCode')}</label>
            <div className="mt-1 flex gap-3">
              <input
                value={entry}
                onChange={(e) => setEntry(e.target.value)}
                placeholder="ABCD-EFGH-JKLM"
                disabled={busy || !configured}
                className="min-w-0 flex-1 rounded-2xl border border-emerald/15 bg-transparent px-4 py-3 font-mono text-sm uppercase tracking-wider text-emerald outline-none focus:border-emerald"
              />
              <button
                className="rounded-2xl border border-emerald px-4 py-3 text-sm font-medium text-emerald disabled:opacity-40"
                disabled={busy || !configured || entry.trim().length < 8}
                onClick={link}
              >
                {t('sync.restore')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
