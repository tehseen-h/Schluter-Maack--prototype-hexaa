import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Simple, dependency-light setup. State-based navigation (no router needed).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, host: true },
})
