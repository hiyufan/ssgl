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
})
