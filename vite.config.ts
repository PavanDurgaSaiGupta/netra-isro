import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const resolveBase = () => {
  // Explicit override via environment variables (e.g. VITE_BASE_PATH="/" npm run build)
  if (process.env.VITE_BASE_PATH) return process.env.VITE_BASE_PATH
  if (process.env.BASE_URL) return process.env.BASE_URL

  // Vercel, Netlify, Cloudflare Pages, Render default to root domain
  if (process.env.VERCEL || process.env.NETLIFY || process.env.CF_PAGES || process.env.RENDER) {
    return '/'
  }

  // GitHub Actions automated deployment: extracts repo name
  if (process.env.GITHUB_REPOSITORY && !process.env.CUSTOM_DOMAIN) {
    const repoName = process.env.GITHUB_REPOSITORY.split('/')[1]
    return `/${repoName}/`
  }

  // Default to /netra-isro/ for GitHub Pages repo or local preview
  return '/netra-isro/'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: resolveBase(),
  build: {
    // No manualChunks: forcing 'three' into a named chunk made it a static dependency of
    // the entry (react-dom was misrouted into it under Rolldown), so every page — including
    // the landing route — preloaded the 1.1 MB three runtime. Letting three/fiber follow
    // their only importer (the lazy /tracking view) drops initial landing JS ~4x.
    chunkSizeWarningLimit: 1000,
  },
})
