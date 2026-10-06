import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/netra-isro/',
  build: {
    // No manualChunks: forcing 'three' into a named chunk made it a static dependency of
    // the entry (react-dom was misrouted into it under Rolldown), so every page — including
    // the landing route — preloaded the 1.1 MB three runtime. Letting three/fiber follow
    // their only importer (the lazy /tracking view) drops initial landing JS ~4x.
    chunkSizeWarningLimit: 1000,
  },
})
