import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// jsdom đôi khi không cấp localStorage đầy đủ → zustand persist (useSettingsStore)
// ném "storage.setItem is not a function". Cấp polyfill in-memory.
if (typeof globalThis.localStorage === 'undefined' || typeof globalThis.localStorage.setItem !== 'function') {
  const store = new Map<string, string>()
  const mock: Storage = {
    getItem: (k) => (store.has(k) ? store.get(k)! : null),
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
    key: (i) => Array.from(store.keys())[i] ?? null,
    get length() { return store.size },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: mock, configurable: true })
}

// Dọn DOM sau mỗi test để các render không dính vào nhau.
afterEach(() => {
  cleanup()
})
