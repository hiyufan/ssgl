import { config } from '@vue/test-utils'
import { vi } from 'vitest'

config.global.stubs = {
  Transition: false,
  'router-link': true,
  'router-view': true
}

// Mock all SCSS imports
vi.mock('*.scss', () => ({}))

// Mock element-plus
vi.mock('element-plus', () => ({
  ElMessage: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn()
  },
  ElLoading: {
    service: vi.fn()
  },
  ElMessageBox: {
    confirm: vi.fn()
  },
  ElNotification: {
    success: vi.fn()
  }
}))
