import { describe, expect, it } from 'vitest'
import { headerBarConfig } from './headerBar'

describe('header bar business configuration', () => {
  it('does not expose the template settings panel in SSGL', () => {
    expect(headerBarConfig.settings.enabled).toBe(false)
  })

  it('does not expose template quick-entry links in SSGL', () => {
    expect(headerBarConfig.fastEnter.enabled).toBe(false)
  })
})
