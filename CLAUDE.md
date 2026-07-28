# Hifz — project guide

A calm, focused Qur'an **memorization** (hifz) companion PWA. Sister app to
**Daily Tilawah** (a reading app) — shares its technical foundation (Qur'an
data layer, font pipeline, theming, i18n pattern) but is a separate,
standalone product with its own identity: emerald/amber instead of
navy/gold, and a tracker rather than a page-a-day reader.

Philosophy: focused and encouraging, never anxiety-inducing. No leaderboards,
no guilt-tripping. Protect the calm — check before adding anything that would
make it feel heavy or cluttered.

## Stack
- React 18 + Vite + Tailwind + react-router-dom. PWA (`public/manifest.webmanifest`, `public/sw.js`).
- No test suite. Verify with `npm run build`. There is **no lint script**.

## Hosting
- **Cloudflare Pages** (planned): build `npm run build`, output `dist`.
- Vite `base` auto-detects (`vite.config.js`): GitHub Actions build → `/hifz/`; everything else (Cloudflare, local) → `/`. No env var needed.
- SPA routing on Cloudflare via `public/_redirects` (`/* /index.html 200`). (Do NOT re-add a GitHub `404.html` — it mangles URLs on Cloudflare.)

## Qur'an data (local-first, with live fallback)
- `npm run build-data` (`scripts/build-quran-data.mjs`, copied from Daily Tilawah) writes `public/data/`: `meta.json`, `page/<1..604>.json` (QCF v2 glyph lines + per-verse words/text), `translation/<edition>.json`, `ayah-pages.json`. See `scripts/DATA.md`.
- `src/utils/api.js` is **local-first**: `getPage`/`getMushafPage`/`getAyahPage` use `public/data/` when present, else fall back to live APIs (quran.com for glyphs, alquran.cloud for translations). Audio streams from islamic.network CDN via computed URLs (not yet wired into the UI — arrives with the repeat/loop phase).
- `getSurah(number, opts)` and `listSurahs()` are Hifz-specific additions on top of the page-based data layer: `getSurah` walks the mushaf pages a surah spans (via `SURAH_PAGES`/`SURAH_AYAHS`) and filters ayahs by surah number, so the app can be surah-centric even though the underlying bundle is organised by page.
- QCF per-page fonts load from jsDelivr (`mushafFontUrl`, `src/utils/fonts.js`). The KFGQPC Uthmanic Hafs unicode font is self-hosted (`public/fonts/`), used as the fallback whenever a page's glyph font hasn't loaded (also the only rendering path in this dev sandbox, since the jsDelivr CDN is unreachable through the sandbox proxy — works normally in production/browsers with real network access).

## Key files
- `src/utils/api.js` — data layer (pages, surahs, translations, reciters, juz/surah tables).
- `src/utils/storage.js` — localStorage: settings (theme, appLang, translation prefs). The per-surah status/notes/lastRevised model arrives in the next phase.
- `src/utils/i18n.jsx` — UI strings in **en / ms / id**. Every user-facing string must have a key in all three.
- `src/utils/fonts.js` — lazy-loads QCF v2 per-page glyph fonts, cached on `document.fonts`.
- `src/utils/theme.js` — applies the `light`/`dark`/`sepia` theme via a `data-theme` attribute.
- Components: `Home` (landing), `SurahIndex` (114 surahs, searchable), `SurahDetail` (Arabic + translation), `AyahCard` (single-ayah render, QCF glyphs with Uthmani-text fallback).

## Data model (per surah; MVP is surah-level, not per-ayah)
Planned for the next phase (`src/utils/storage.js`):
- `status`: `'new' | 'memorizing' | 'memorized' | 'revision'`
- `notes`: free-text tadabbur (reflection) notes
- `lastRevised`: date, powers the revision-due list
- lightweight daily activity, for dashboard stats

Per-ayah status is a possible future extension (heavier data model) —
confirm with the product owner before building it.

## Conventions
- Themes via CSS variables (`light`/`dark`/`sepia`) in `index.css`; `paper`/`emerald`/`amber`/`muted` Tailwind colors map to them. Applied pre-paint by an inline script in `index.html`.
- Palette: emerald primary (`--c-emerald`) + amber accent (`--c-amber`) — a sister palette to Tilawah's navy/gold, not a clone. Same warm-paper base surface.
- All settings live in `DEFAULT_SETTINGS` (`storage.js`).
- After changes: `npm run build` to verify; commit; push to the working branch.

## Build order (tracked progress)
1. ✅ Scaffold + Qur'an data layer + surah index + surah detail (Arabic + translation).
2. Status model (new/memorizing/memorized/revision) + color-coded badges + per-surah status controls + dashboard progress stats.
3. Tadabbur notes editor + tafsir toggle (quran.com tafsir API, cached locally).
4. Audio with single-ayah repeat/loop; "test yourself" hide/reveal recall mode.
5. Revision list + `lastRevised` tracking.
6. Phase 2: full PWA offline caching, then optional Cloudflare Worker + KV sync (mirrors Daily Tilawah's `worker/` + `cloudSync.js`).

## Assets
- `assets/icon-master.svg` — the app icon source (open Qur'an on a rehal, emerald tile, amber revision-loop + bookmark accent). `npm run icons` (`scripts/gen-icons.mjs`) rasterizes it into `public/icons/`.
