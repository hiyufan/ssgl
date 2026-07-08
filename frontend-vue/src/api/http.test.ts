import { describe, expect, it, vi, beforeEach } from 'vitest'

// Mock element-plus completely before any imports
vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  }
}))

// Mock axios
vi.mock('axios', () => {
  const instance = {
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() }
    },
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn()
  }
  return {
    default: {
      create: vi.fn(() => instance),
      post: vi.fn()
    }
  }
})

// Mock localStorage
const store: Record<string, string> = {}
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => {
    store[key] = value
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key]
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach(key => delete store[key])
  }),
  length: 0,
  key: vi.fn()
}
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock })

import { clearTokens, getAccessToken, setTokens } from './http'

describe('SSGL token helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.keys(store).forEach(key => delete store[key])
  })

  it('stores and clears access and refresh tokens', () => {
    setTokens({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600 })
    expect(getAccessToken()).toBe('access-1')

    clearTokens()
    expect(getAccessToken()).toBeNull()
  })
})
