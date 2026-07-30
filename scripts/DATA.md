# Bundling the Qur'an data (offline + scale-proof)

The app can serve its own Qur'an content from `public/data/` instead of calling
quran.com / alquran.cloud at runtime. This makes reading **offline, instant,
and infinitely scalable** (served from your own CDN), removing the only
third-party reliability/rate-limit risk before a public launch.

It's **optional and safe**: if `public/data/` is absent, the app automatically
falls back to the live APIs. Generating it just flips reading to local.

## Generate it (one time, ~3–4 min)

From the repo root, on a machine with internet:

```bash
npm run build-data
```

This writes, under `public/data/`:

- `meta.json` — surah names (Arabic/English)
- `page/1.json … page/604.json` — per-page QCF v2 glyph lines + verses
- `translation/<edition>.json` — each translation/transliteration, keyed `surah:ayah`
- `ayah-pages.json` — surah:ayah → mushaf page (for the "jump/start" picker)

## Then commit & deploy

```bash
git add public/data
git commit -m "Bundle Qur'an data for offline + scale"
git push
```

Cloudflare Pages serves these files from its CDN. Audio still streams from a
CDN (computed URLs, no API). Re-run `npm run build-data` only if you want to
refresh translations or add an edition (keep the editions list in step with
`TRANSLATIONS` in `src/utils/api.js`).
