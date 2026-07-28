// Applies the theme by toggling a data-theme attribute on <html>, which
// switches the CSS-variable palette in index.css. The matching theme is also
// set pre-paint by an inline script in index.html to avoid a flash.

export function applyTheme(theme) {
  const el = document.documentElement
  if (theme && theme !== 'light') el.dataset.theme = theme
  else delete el.dataset.theme

  // Keep the browser UI (status bar / address bar) colour in step.
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) {
    const bg = getComputedStyle(document.body).backgroundColor
    if (bg) meta.setAttribute('content', bg)
  }
}
