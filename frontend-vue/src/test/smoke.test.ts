import { describe, expect, it } from 'vitest'

describe('frontend-vue scaffold', () => {
  it('vitest is configured and working', () => {
    expect(1 + 1).toBe(2)
  })

  it('jsdom environment is available', () => {
    expect(typeof document).toBe('object')
    expect(typeof window).toBe('object')
  })
})
