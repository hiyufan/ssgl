import { describe, expect, it } from 'vitest'
import { ssglRoutes } from './ssgl'

function flatten(paths: string[], route: any, prefix = ''): string[] {
  const full = route.path.startsWith('/') ? route.path : `${prefix}/${route.path}`.replace(/\/+/g, '/')
  paths.push(full)
  for (const child of route.children ?? []) {
    flatten(paths, child, full)
  }
  return paths
}

function findRoute(path: string, routes: any[] = ssglRoutes, prefix = ''): any {
  for (const route of routes) {
    const full = route.path.startsWith('/')
      ? route.path
      : `${prefix}/${route.path}`.replace(/\/+/g, '/')
    if (full === path) return route
    const child = findRoute(path, route.children ?? [], full)
    if (child) return child
  }
  return null
}

function rolesFor(path: string): string[] {
  const route = findRoute(path)
  return route?.meta?.roles ?? []
}

describe('SSGL routes', () => {
  it('contains every migrated business route', () => {
    const paths = ssglRoutes.flatMap((route) => flatten([], route))
    expect(paths).toEqual(
      expect.arrayContaining([
        '/dashboard',
        '/competition-ops/competitions',
        '/competition-ops/teams',
        '/competition-ops/calendar',
        '/workflow/approvals',
        '/workflow/preplans',
        '/workflow/registrations',
        '/workflow/awards',
        '/workflow/evaluations',
        '/workflow/feedback',
        '/data-insights/stats',
        '/data-insights/analytics',
        '/data-insights/kanban',
        '/data-insights/insights',
        '/data-insights/leaderboard',
        '/data-insights/showcase',
        '/data-insights/achievement-gallery',
        '/data-insights/points',
        '/data-insights/compare',
        '/data-insights/growth',
        '/data-insights/learning-path',
        '/data-insights/annual-report',
        '/ai-assistants/aitools',
        '/ai-assistants/coach',
        '/ai-assistants/assistant',
        '/ai-assistants/execution-match',
        '/ai-assistants/knowledge-base',
        '/system-admin/audit-logs',
        '/system-admin/diagnostics',
        '/account/notifications',
        '/account/profile'
      ])
    )
  })

  it('separates student, teacher, and admin-only surfaces', () => {
    expect(rolesFor('/workflow/registrations')).toEqual(['teacher'])
    expect(rolesFor('/workflow/awards')).toEqual(['teacher'])
    expect(rolesFor('/data-insights/stats')).toEqual(['teacher'])
    expect(rolesFor('/data-insights/annual-report')).toEqual(['teacher'])
    expect(rolesFor('/data-insights/growth')).toEqual(['student'])
    expect(rolesFor('/data-insights/learning-path')).toEqual(['student'])
    expect(rolesFor('/data-insights/points')).toEqual(['student'])
    expect(rolesFor('/ai-assistants/knowledge-base')).toEqual(['teacher'])
    expect(rolesFor('/system-admin/audit-logs')).toEqual(['admin'])
    expect(rolesFor('/system-admin/diagnostics')).toEqual(['admin'])
    expect(rolesFor('/account/notifications')).toEqual(['student', 'teacher', 'admin'])
  })
})
