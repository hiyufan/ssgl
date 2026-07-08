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
        '/competitions',
        '/teams',
        '/calendar',
        '/approvals',
        '/preplans',
        '/registrations',
        '/awards',
        '/evaluations',
        '/stats',
        '/analytics',
        '/kanban',
        '/insights',
        '/leaderboard',
        '/showcase',
        '/achievement-gallery',
        '/points',
        '/compare',
        '/growth',
        '/learning-path',
        '/annual-report',
        '/aitools',
        '/coach',
        '/assistant',
        '/execution-match',
        '/knowledge-base',
        '/audit-logs',
        '/diagnostics',
        '/notifications',
        '/profile',
        '/feedback'
      ])
    )
  })

  it('has 31 routes', () => {
    expect(ssglRoutes.length).toBe(31)
  })
})
