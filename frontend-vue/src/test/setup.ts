import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock localStorage globally before any other code runs
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value }),
  removeItem: vi.fn((key: string) => { delete store[key] }),
  clear: vi.fn(() => { Object.keys(store).forEach(key => delete store[key]) }),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock sessionStorage
const sessionStore: Record<string, string> = {}
const sessionStorageMock = {
  getItem: vi.fn((key: string) => sessionStore[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { sessionStore[key] = value }),
  removeItem: vi.fn((key: string) => { delete sessionStore[key] }),
  clear: vi.fn(() => { Object.keys(sessionStore).forEach(key => delete sessionStore[key]) }),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(globalThis, 'sessionStorage', { value: sessionStorageMock })

config.global.stubs = {
  Transition: false,
  'router-link': true,
  'router-view': true
}

// Mock all SCSS imports
vi.mock('*.scss', () => ({}))

// Mock element-plus
vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  },
  ElLoading: {
    service: vi.fn()
  },
  ElMessageBox: {
    confirm: vi.fn()
  },
  ElNotification: {
    success: vi.fn()
  }
}))
