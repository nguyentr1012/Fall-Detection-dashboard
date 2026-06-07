import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

// Cấu hình test độc lập với Next runtime: chỉ unit-test store/lib/hooks/components
// trong jsdom. Alias '@/*' khớp với tsconfig ("@/*": ["./*"]).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.{ts,tsx}'],
    css: false,
    restoreMocks: true,
  },
})
