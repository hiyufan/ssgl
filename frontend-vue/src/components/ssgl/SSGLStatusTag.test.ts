import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'

// Mock element-plus
vi.mock('element-plus', () => ({
  ElTag: {
    name: 'ElTag',
    template: '<span><slot /></span>',
    props: ['type', 'effect', 'round']
  }
}))

import SSGLStatusTag from './SSGLStatusTag.vue'

describe('SSGLStatusTag', () => {
  it('renders known status labels', () => {
    const wrapper = mount(SSGLStatusTag, {
      props: { status: 'published' }
    })
    expect(wrapper.text()).toContain('已发布')
  })

  it('renders unknown status as-is', () => {
    const wrapper = mount(SSGLStatusTag, {
      props: { status: 'custom_status' }
    })
    expect(wrapper.text()).toContain('custom_status')
  })
})
