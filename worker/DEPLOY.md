# Deploying the Hifz sync backend (Cloudflare Workers)

This Worker powers optional "Back up & sync" (Settings → Back up & sync): a
sync code or Google sign-in stores a snapshot of your progress (status,
notes, settings) in KV so it follows you across devices. It's free on
Cloudflare's Workers + KV free tiers, and entirely optional — the app works
fully offline without it.

You'll do this once. Total time ~5–10 minutes. Everything runs from the
`worker/` folder.

## 0. Prerequisites
- A free [Cloudflare account](https://dash.cloudflare.com/sign-up)
- Node.js 18+ installed locally

```bash
cd worker
npm install
npx wrangler login        # opens the browser to authorise
```

## 1. Create the KV namespace
```bash
npx wrangler kv namespace create HIFZ_KV
```
Copy the printed `id = "…"` into `wrangler.toml` under `[[kv_namespaces]]`
(replace `REPLACE_WITH_KV_NAMESPACE_ID`).

## 2. Deploy
```bash
npm run deploy
```
Note the deployed URL, e.g. `https://hifz-sync.<you>.workers.dev`. Verify
it's up:
```bash
curl https://hifz-sync.<you>.workers.dev/health   # {"ok":true}
```

## 3. Point the app at the Worker
In the repo root, edit `src/config.js`:
```js
export const WORKER_URL = 'https://hifz-sync.<you>.workers.dev'
```
Commit and push — the app redeploys automatically. The sync-code flow
(Settings → Back up & sync → "Create a sync code") now works with no further
setup:
- `POST /sync/push` — `{ code, data }` stores a snapshot under `acct:<code>`.
- `POST /sync/pull` — `{ code }` returns the stored snapshot (404 if unknown).

The sync **code is the credential** (anyone with it can read/write that
record), so it's generated with ~60 bits of entropy.

## Sign in with Google (optional — one-tap sync)
Lets someone just tap **Sign in with Google** on each device instead of
copying a code. Needs a free Google OAuth client; the Worker validates the
sign-in and stores that user's data under `gacct:<google-user-id>`.

1. **Create an OAuth Client ID** in the
   [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create (or pick) a project → **OAuth consent screen** → External →
     fill in app name + your email → save. Add yourself under **Test users**
     (or **Publish** the app once you're happy).
   - **Credentials → Create credentials → OAuth client ID → Web application**.
   - Under **Authorised JavaScript origins**, add the site origin(s) where the
     app runs (origin only — no path; add `http://localhost:5173` too for
     local dev).
   - Copy the **Client ID** (looks like `…apps.googleusercontent.com`).

2. **Tell the app and the Worker** the same client id:
   - App: `src/config.js` → `export const GOOGLE_CLIENT_ID = '…apps.googleusercontent.com'`
   - Worker: `worker/wrangler.toml` → `[vars] GOOGLE_CLIENT_ID = "…apps.googleusercontent.com"`

3. **Redeploy** the Worker (`npm run deploy`) and push the app change.

The "Sign in with Google" button appears automatically once both
`WORKER_URL` and `GOOGLE_CLIENT_ID` are set. Endpoints:
- `POST /auth/google` — `{ idToken }`; verified via Google's `tokeninfo`,
  returns an opaque `token` (180-day session) + any existing data.
- `POST /sync/pull` & `/sync/push` also accept `{ token }` instead of `{ code }`.

## Optional: private usage stats
```bash
npx wrangler secret put STATS_TOKEN
```
Then `GET /stats?token=<that token>` returns account counts. Returns 501
(disabled) until the secret is set.

## Notes
- Costs: KV reads/writes are a handful per sync — comfortably inside the free
  tier for any realistic number of users.
- Local testing: `npm run dev` runs the Worker + a simulated KV locally via
  Miniflare — no Cloudflare account needed for that.
