import { computed } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { MenuProcessor } from './MenuProcessor'
import { useUserStore } from '@/store/modules/user'

vi.mock('@/hooks/core/useAppMode', () => ({
  useAppMode: () => ({
    isFrontendMode: computed(() => true),
    isBackendMode: computed(() => false),
    currentMode: computed(() => 'frontend')
  })
}))

vi.mock('@/router', () => ({
  router: { push: vi.fn(), currentRoute: { value: { path: '/' } } }
}))

vi.mock('@/router/guards/beforeEach', () => ({
  resetRouterState: vi.fn()
}))

function flattenPaths(routes: any[]): string[] {
  return routes.flatMap((route) => [
    route.path,
    ...flattenPaths(route.children ?? [])
  ])
}

describe('MenuProcessor role filtering', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('uses the normalized user role when filtering frontend menus', async () => {
    const userStore = useUserStore()
    userStore.setUserInfo({
      id: 9,
      username: 'student1',
      email: 'student1@example.com',
      role: 'student',
      name: '学生一',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    })

    const menuList = await new MenuProcessor().getMenuList()
    const paths = flattenPaths(menuList)

    expect(paths).toContain('/data-insights/growth')
    expect(paths).not.toContain('/workflow/registrations')
    expect(paths).not.toContain('/system-admin/audit-logs')
  })
})
