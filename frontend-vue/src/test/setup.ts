import { config } from '@vue/test-utils'

config.global.stubs = {
  Transition: false,
  'router-link': true,
  'router-view': true
}
