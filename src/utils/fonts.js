// Loads the QCF v2 per-page mushaf glyph fonts on demand and caches them on
// document.fonts. Shared by the Mushaf page view and the glyph-rendered ayah
// list, so both draw the official King Fahd glyphs (correct tajwīd marks).

import { mushafFontUrl } from './api'

export async function ensurePageFont(page) {
  const family = `qcf2p${page}`
  if ([...document.fonts].some((f) => f.family === family)) return family
  const face = new FontFace(family, `url(${mushafFontUrl(page)})`, {
    display: 'swap',
  })
  await face.load()
  document.fonts.add(face)
  return family
}
