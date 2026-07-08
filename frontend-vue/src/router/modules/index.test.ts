import { describe, expect, it } from 'vitest'
import { routeModules } from '.'

function collectPaths(route: any, prefix = ''): string[] {
  const full = route.path.startsWith('/')
    ? route.path
    : `${prefix}/${route.path}`.replace(/\/+/g, '/')

  return [full, ...(route.children ?? []).flatMap((child: any) => collectPaths(child, full))]
}

describe('route modules', () => {
  it('does not expose template/demo route modules in the business menu source', () => {
    const paths = routeModules.flatMap((route) => collectPaths(route))

    expect(paths).not.toContain('/examples')
    expect(paths).not.toContain('/dashboard/ecommerce')
    expect(paths).not.toContain('/system/user-center')
  })
})
