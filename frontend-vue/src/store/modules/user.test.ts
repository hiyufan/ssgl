import { vi, beforeEach, describe, expect, it } from 'vitest'

// Mock @vue/devtools-kit
vi.mock('@vue/devtools-kit', () => ({
  devtools: { on: vi.fn(), off: vi.fn() },
  devtoolsPerformance: { now: vi.fn(() => 0) }
}))

// Mock axios
vi.mock('axios', () => {
  const instance = {
    interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } },
    get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn()
  }
  return { default: { create: vi.fn(() => instance), post: vi.fn() } }
})

// Mock router
vi.mock('@/router', () => ({
  router: { push: vi.fn(), currentRoute: { value: { path: '/' } } }
}))

// Mock other dependencies
vi.mock('@/utils/router', () => ({ setPageTitle: vi.fn() }))
vi.mock('@/router/guards/beforeEach', () => ({ resetRouterState: vi.fn() }))
vi.mock('@/store/modules/setting', () => ({ useSettingStore: () => ({}) }))
vi.mock('@/store/modules/worktab', () => ({ useWorktabStore: () => ({ opened: [], keepAliveExclude: [] }) }))
vi.mock('@/store/modules/menu', () => ({ useMenuStore: () => ({ setHomePath: vi.fn() }) }))
vi.mock('@/utils/storage/storage-config', () => ({ StorageConfig: { LAST_USER_ID_KEY: 'last_user_id' } }))

import { createPinia, setActivePinia } from 'pinia'
import { useUserStore } from './user'

describe('SSGL user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('stores user role and exposes roles array for menu filtering', () => {
    const store = useUserStore()
    store.setUserInfo({
      id: 1,
      username: 'liuzy',
      email: 'liuzy@example.com',
      role: 'admin',
      name: '刘老师',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    })

    expect(store.info.role).toBe('admin')
    expect(store.roles).toEqual(['admin'])
  })

  it('stores and retrieves tokens', () => {
    const store = useUserStore()
    store.setToken('test-access-token', 'test-refresh-token')

    expect(store.accessToken).toBe('test-access-token')
    expect(store.refreshToken).toBe('test-refresh-token')
  })
})
