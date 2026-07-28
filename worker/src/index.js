// Hifz cloud sync backend (Cloudflare Worker).
//
// Purely optional, additive sync for an otherwise local-first app: pulls and
// pushes a JSON snapshot of localStorage keys the app cares about (settings +
// the per-surah status/notes map), addressed by either a sync code or a
// Google account. No prayer-time reminders here — that's Daily Tilawah's
// worker, not this one.
//
// Storage: one KV entry per account, `{ data, updatedAt }`.

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  })
}

async function readBody(request) {
  try {
    return await request.json()
  } catch {
    return null
  }
}

// --- cloud sync (account by sync code OR Google sign-in) --------------------
// An account is addressed either by a sync code (`acct:<code>`) or by a
// Google user id (`gacct:<sub>`). Google sign-in exchanges an ID token for an
// opaque session token (`gsess:<token>` → sub) that the client then uses for
// pull/push, so the short-lived ID token never has to be re-sent on every sync.
function normalizeCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

const SESSION_TTL = 60 * 60 * 24 * 180 // 180 days

function randomToken() {
  const b = new Uint8Array(24)
  crypto.getRandomValues(b)
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
}

// Validate a Google ID token via Google's tokeninfo endpoint (Google checks the
// signature and expiry; we check the audience). Returns the token payload.
async function verifyGoogleIdToken(idToken, env) {
  const res = await fetch(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken)
  )
  if (!res.ok) throw new Error('invalid token')
  const p = await res.json()
  if (!p.sub) throw new Error('no subject')
  if (env.GOOGLE_CLIENT_ID && p.aud !== env.GOOGLE_CLIENT_ID) {
    throw new Error('wrong audience')
  }
  return p
}

// Resolve which account a request targets, from a Google session token or a
// sync code. Returns the KV key, or null if the credential is missing/invalid.
async function resolveAcctKey(body, env) {
  if (body && body.token) {
    const sub = await env.HIFZ_KV.get(`gsess:${body.token}`)
    if (!sub) return null
    // Refresh the session lifetime on use.
    await env.HIFZ_KV.put(`gsess:${body.token}`, sub, { expirationTtl: SESSION_TTL })
    return `gacct:${sub}`
  }
  if (body && body.code) {
    const code = normalizeCode(body.code)
    if (code.length < 8) return null
    return `acct:${code}`
  }
  return null
}

async function handleAuthGoogle(request, env) {
  const body = await readBody(request)
  if (!body || !body.idToken) return json({ error: 'idToken required' }, 400)
  if (!env.GOOGLE_CLIENT_ID) return json({ error: 'google auth not configured' }, 501)

  let payload
  try {
    payload = await verifyGoogleIdToken(body.idToken, env)
  } catch {
    return json({ error: 'invalid token' }, 401)
  }

  const token = randomToken()
  await env.HIFZ_KV.put(`gsess:${token}`, payload.sub, { expirationTtl: SESSION_TTL })

  const doc = JSON.parse((await env.HIFZ_KV.get(`gacct:${payload.sub}`)) || 'null')
  return json({
    token,
    profile: {
      name: payload.name || '',
      email: payload.email || '',
      picture: payload.picture || '',
    },
    data: doc ? doc.data : null,
  })
}

async function handleAuthSignout(request, env) {
  const body = await readBody(request)
  if (body && body.token) await env.HIFZ_KV.delete(`gsess:${body.token}`)
  return json({ ok: true })
}

async function handleSyncPull(request, env) {
  const body = await readBody(request)
  const key = await resolveAcctKey(body, env)
  if (!key) return json({ error: 'invalid credential' }, 400)
  const doc = JSON.parse((await env.HIFZ_KV.get(key)) || 'null')
  if (!doc) return json({ error: 'not found' }, 404)
  return json({ data: doc.data, updatedAt: doc.updatedAt })
}

async function handleSyncPush(request, env) {
  const body = await readBody(request)
  const key = await resolveAcctKey(body, env)
  if (!key) return json({ error: 'invalid credential' }, 400)
  if (!body.data || typeof body.data !== 'object') return json({ error: 'no data' }, 400)
  await env.HIFZ_KV.put(key, JSON.stringify({ data: body.data, updatedAt: Date.now() }))
  return json({ ok: true })
}

// Count KV keys under a prefix, paginating so the total stays accurate beyond
// the 1000-key-per-list limit.
async function countPrefix(env, prefix) {
  let count = 0
  let cursor
  for (;;) {
    const res = await env.HIFZ_KV.list({ prefix, cursor, limit: 1000 })
    count += res.keys.length
    if (res.list_complete) break
    cursor = res.cursor
  }
  return count
}

// Private usage stats. Inert until STATS_TOKEN is set (wrangler secret put),
// then require it via `?token=` or an `Authorization: Bearer` header.
async function handleStats(request, env) {
  const expected = env.STATS_TOKEN
  if (!expected) return json({ error: 'stats not configured' }, 501)
  const url = new URL(request.url)
  const auth = request.headers.get('Authorization') || ''
  const provided =
    url.searchParams.get('token') || (auth.startsWith('Bearer ') ? auth.slice(7) : '')
  if (provided !== expected) return json({ error: 'unauthorized' }, 401)

  const [googleUsers, codeAccounts] = await Promise.all([
    countPrefix(env, 'gacct:'),
    countPrefix(env, 'acct:'),
  ])
  return json({ googleUsers, codeAccounts, totalAccounts: googleUsers + codeAccounts })
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
    const url = new URL(request.url)

    if (request.method === 'GET' && url.pathname === '/health') return json({ ok: true })
    if (request.method === 'GET' && url.pathname === '/stats') return handleStats(request, env)
    if (request.method === 'POST' && url.pathname === '/auth/google')
      return handleAuthGoogle(request, env)
    if (request.method === 'POST' && url.pathname === '/auth/signout')
      return handleAuthSignout(request, env)
    if (request.method === 'POST' && url.pathname === '/sync/pull')
      return handleSyncPull(request, env)
    if (request.method === 'POST' && url.pathname === '/sync/push')
      return handleSyncPush(request, env)

    return json({ error: 'not found' }, 404)
  },
}
