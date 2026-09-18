/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  test: {
    // Components need a DOM; jsdom provides one in Node.
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
