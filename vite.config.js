import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: '/joyful-org-chart/',
  plugins: [react()],
  // Honor a PORT assigned by the environment (the preview harness sets one when
  // 5173 is taken by another project). Falls back to Vite's default otherwise.
  server: { port: Number(process.env.PORT) || undefined },
})
