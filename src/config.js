// Backend configuration for optional cloud sync.
//
// These are filled in AFTER you deploy the Cloudflare Worker (see
// worker/DEPLOY.md). Until then they stay empty and the app degrades
// gracefully: everything works fully offline/local-first, and the
// "Back up & sync" screen explains that the sync service isn't set up yet.
//
// WORKER_URL       — the deployed Worker origin, e.g.
//                    'https://hifz-sync.<your-subdomain>.workers.dev'
// GOOGLE_CLIENT_ID — the OAuth 2.0 Web Client ID from Google Cloud Console,
//                    used for "Sign in with Google". Leave empty to hide the
//                    Google option (the sync-code flow still works). The
//                    same value must be set as GOOGLE_CLIENT_ID on the
//                    Worker so it can verify the tokens. See worker/DEPLOY.md.

export const WORKER_URL = 'https://hifz-sync.danisheddie1405.workers.dev'
export const GOOGLE_CLIENT_ID = '515296416644-ema4raa8d8t1p1sk14ijai9gk5qqstc1.apps.googleusercontent.com'

export const syncConfigured = () => Boolean(WORKER_URL)

// Google sign-in needs both the backend (to verify tokens) and a client id.
export const googleAuthConfigured = () => Boolean(WORKER_URL) && Boolean(GOOGLE_CLIENT_ID)
