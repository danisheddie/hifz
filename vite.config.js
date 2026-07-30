import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` is the path the app is served from. The GitHub Actions build targets
// the project path (https://<user>.github.io/hifz/); every other build
// (Cloudflare, local dev) serves at the root domain. Auto-detected so no build
// variable is required.
export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? '/hifz/' : '/',
  plugins: [react()],
})
