# Frontend Vue Art Design Pro Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `frontend-vue`, a complete Vue 3 + Art Design Pro replacement for the current React SSGL frontend.

**Architecture:** Create a new `frontend-vue` app from `D:\Code\art-design-pro`, then adapt its shell, auth, router, menu, API layer, and pages to SSGL. Keep `frontend-vite` as the reference implementation until the Vue app builds, runs, and covers every current business route.

**Tech Stack:** Vue 3, Vite, TypeScript, Element Plus, Pinia, Vue Router, ECharts, Axios, Vitest, Art Design Pro, Go backend `/api/v1`, AI service `/ai/api/v1`.

---

## Scope Check

This is a full frontend rewrite with several independent workstreams: base scaffold, API/auth, router/menu, shared UI, business pages, AI pages, and rollout. Execute this as a sequence of small commits. When using subagents, dispatch one fresh worker per task and review before starting the next task.

## File Structure

Create and modify these areas:

- Create `frontend-vue/` by copying `D:\Code\art-design-pro`.
- Modify `frontend-vue/package.json`, `frontend-vue/.env`, `frontend-vue/.env.development`, `frontend-vue/vite.config.ts`.
- Create `frontend-vue/src/types/ssgl.ts` for migrated SSGL business types.
- Create `frontend-vue/src/api/http.ts`, `frontend-vue/src/api/auth.ts`, `frontend-vue/src/api/ssgl.ts`, `frontend-vue/src/api/ai.ts`.
- Modify `frontend-vue/src/store/modules/user.ts` to store SSGL users, roles, and tokens.
- Create `frontend-vue/src/router/modules/ssgl.ts`.
- Modify `frontend-vue/src/router/modules/index.ts`, `frontend-vue/src/router/routes/staticRoutes.ts`, `frontend-vue/src/router/guards/beforeEach.ts`, `frontend-vue/src/router/routesAlias.ts`.
- Create `frontend-vue/src/components/ssgl/` for shared SSGL table, state, status, chart, and AI output components.
- Create `frontend-vue/src/composables/ssgl/` for auth, notifications, streaming, paging, and form helpers.
- Create `frontend-vue/src/views/ssgl/` for all SSGL pages.
- Modify `README.md`, `build_frontend.sh`, and `start_server.sh` only after the Vue frontend passes build and smoke checks.

## Source Reference Map

Use these React files as the behavior source of truth:

```text
frontend-vite/src/App.tsx
frontend-vite/src/components/layout/sidebar.tsx
frontend-vite/src/components/layout/topbar.tsx
frontend-vite/src/services/api.ts
frontend-vite/src/stores/auth.ts
frontend-vite/src/types/index.ts
frontend-vite/src/pages/**/*.tsx
frontend-vite/src/components/ai/**/*.tsx
frontend-vite/src/hooks/useNotifications.ts
frontend-vite/src/hooks/use-role.ts
```

Use these Art Design Pro files as the framework source of truth:

```text
D:\Code\art-design-pro\src\main.ts
D:\Code\art-design-pro\src\App.vue
D:\Code\art-design-pro\src\views\index\index.vue
D:\Code\art-design-pro\src\router\index.ts
D:\Code\art-design-pro\src\router\guards\beforeEach.ts
D:\Code\art-design-pro\src\router\core\MenuProcessor.ts
D:\Code\art-design-pro\src\router\core\RouteRegistry.ts
D:\Code\art-design-pro\src\router\core\RouteTransformer.ts
D:\Code\art-design-pro\src\store\modules\user.ts
D:\Code\art-design-pro\src\utils\http\index.ts
```

---

### Task 1: Create `frontend-vue` From Art Design Pro

**Files:**
- Create: `frontend-vue/`
- Modify: `frontend-vue/package.json`
- Modify: `frontend-vue/.env`
- Modify: `frontend-vue/.env.development`
- Modify: `frontend-vue/.env.production`
- Modify: `frontend-vue/vite.config.ts`

- [ ] **Step 1: Verify source and target directories**

Run:

```powershell
Test-Path -LiteralPath 'D:\Code\art-design-pro'
Test-Path -LiteralPath 'D:\Code\ssgl\frontend-vue'
```

Expected:

```text
True
False
```

- [ ] **Step 2: Copy the template**

Run:

```powershell
Copy-Item -LiteralPath 'D:\Code\art-design-pro' -Destination 'D:\Code\ssgl\frontend-vue' -Recurse
Remove-Item -LiteralPath 'D:\Code\ssgl\frontend-vue\.git' -Recurse -Force
```

Expected: `D:\Code\ssgl\frontend-vue` exists and does not contain its own `.git` directory.

- [ ] **Step 3: Update package metadata**

Edit `frontend-vue/package.json`:

```json
{
  "name": "ssgl-frontend-vue",
  "version": "0.1.0",
  "type": "module",
  "engines": {
    "node": ">=20.19.0",
    "pnpm": ">=8.8.0"
  },
  "scripts": {
    "dev": "vite",
    "build": "vue-tsc --noEmit && vite build",
    "serve": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint",
    "fix": "eslint --fix",
    "lint:prettier": "prettier --write \"**/*.{js,cjs,ts,json,tsx,css,less,scss,vue,html,md}\"",
    "lint:stylelint": "stylelint  \"**/*.{css,scss,vue}\" --fix",
    "lint:lint-staged": "lint-staged",
    "prepare": "husky",
    "commit": "git-cz",
    "clean:dev": "tsx scripts/clean-dev.ts"
  }
}
```

Keep the existing `dependencies`, `devDependencies`, `config`, and `lint-staged` blocks from Art Design Pro. Add `vitest`, `@vue/test-utils`, and `jsdom` in Task 2.

- [ ] **Step 4: Set environment defaults**

Edit `frontend-vue/.env`:

```text
VITE_VERSION = 0.1.0
VITE_PORT = 5174
VITE_BASE_URL = /
VITE_ACCESS_MODE = frontend
VITE_WITH_CREDENTIALS = false
VITE_OPEN_ROUTE_INFO = false
VITE_LOCK_ENCRYPT_KEY = ssgl_vue_lock_key
```

Edit `frontend-vue/.env.development`:

```text
VITE_BASE_URL = /
VITE_API_URL = /
VITE_API_PROXY_URL = http://localhost:8080
VITE_AI_PROXY_URL = http://localhost:8000
VITE_DROP_CONSOLE = false
```

Edit `frontend-vue/.env.production`:

```text
VITE_BASE_URL = /
VITE_API_URL = /
VITE_DROP_CONSOLE = true
```

- [ ] **Step 5: Add AI proxy to Vite**

In `frontend-vue/vite.config.ts`, keep the Art Design Pro plugins and aliases. Change the environment destructuring and proxy block to include `VITE_AI_PROXY_URL`:

```ts
const {
  VITE_VERSION,
  VITE_PORT,
  VITE_BASE_URL,
  VITE_API_URL,
  VITE_API_PROXY_URL,
  VITE_AI_PROXY_URL
} = env

server: {
  port: Number(VITE_PORT),
  proxy: {
    '/api': {
      target: VITE_API_PROXY_URL,
      changeOrigin: true
    },
    '/ai': {
      target: VITE_AI_PROXY_URL,
      changeOrigin: true
    }
  },
  host: true
},
```

- [ ] **Step 6: Install dependencies**

Run:

```powershell
pnpm install
```

from `D:\Code\ssgl\frontend-vue`.

Expected: lockfile resolves successfully.

- [ ] **Step 7: Commit scaffold**

Run:

```powershell
git add frontend-vue
git commit -m "feat: scaffold vue frontend from art design pro"
```

---

### Task 2: Add Test Harness And Baseline Checks

**Files:**
- Modify: `frontend-vue/package.json`
- Modify: `frontend-vue/vite.config.ts`
- Create: `frontend-vue/src/test/setup.ts`
- Create: `frontend-vue/src/test/smoke.test.ts`

- [ ] **Step 1: Add test dependencies**

Run:

```powershell
pnpm add -D vitest @vue/test-utils jsdom
```

from `D:\Code\ssgl\frontend-vue`.

- [ ] **Step 2: Configure Vitest**

Add this `test` block inside `defineConfig` in `frontend-vue/vite.config.ts`:

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['./src/test/setup.ts'],
  globals: true
},
```

Add this import near the top:

```ts
/// <reference types="vitest" />
```

- [ ] **Step 3: Create test setup**

Create `frontend-vue/src/test/setup.ts`:

```ts
import { config } from '@vue/test-utils'

config.global.stubs = {
  Transition: false,
  'router-link': true,
  'router-view': true
}
```

- [ ] **Step 4: Create baseline smoke test**

Create `frontend-vue/src/test/smoke.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import App from '@/App.vue'

describe('frontend-vue scaffold', () => {
  it('loads the root Vue component', () => {
    expect(App).toBeTruthy()
  })
})
```

- [ ] **Step 5: Run test and build**

Run:

```powershell
pnpm test
pnpm build
```

Expected:

```text
Test Files  1 passed
```

and the build exits with code 0.

- [ ] **Step 6: Commit test harness**

Run:

```powershell
git add frontend-vue/package.json frontend-vue/pnpm-lock.yaml frontend-vue/vite.config.ts frontend-vue/src/test
git commit -m "test: add vue frontend smoke test harness"
```

---

### Task 3: Migrate SSGL Types And API Clients

**Files:**
- Create: `frontend-vue/src/types/ssgl.ts`
- Create: `frontend-vue/src/api/http.ts`
- Create: `frontend-vue/src/api/auth.ts`
- Create: `frontend-vue/src/api/ssgl.ts`
- Create: `frontend-vue/src/api/ai.ts`
- Create: `frontend-vue/src/api/index.ts`
- Create: `frontend-vue/src/api/http.test.ts`

- [ ] **Step 1: Copy and normalize business types**

Create `frontend-vue/src/types/ssgl.ts` by migrating all exported interfaces from `frontend-vite/src/types/index.ts`. Remove the duplicate `UserSummary` export by keeping one interface:

```ts
export interface UserSummary {
  id: number
  username: string
  name: string
  dept?: string
  role?: string
  avatar?: string
}
```

Keep the current SSGL field names unchanged, including snake_case backend fields.

- [ ] **Step 2: Write HTTP client test**

Create `frontend-vue/src/api/http.test.ts`:

```ts
import { describe, expect, it, vi } from 'vitest'
import { clearTokens, getAccessToken, setTokens } from './http'

describe('SSGL token helpers', () => {
  it('stores and clears access and refresh tokens', () => {
    const store: Record<string, string> = {}
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key) => store[key] ?? null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key, value) => {
      store[key] = value
    })
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key) => {
      delete store[key]
    })

    setTokens({ access_token: 'access-1', refresh_token: 'refresh-1', expires_in: 3600 })
    expect(getAccessToken()).toBe('access-1')

    clearTokens()
    expect(getAccessToken()).toBeNull()
  })
})
```

- [ ] **Step 3: Create HTTP client**

Create `frontend-vue/src/api/http.ts`:

```ts
import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig
} from 'axios'
import { ElMessage } from 'element-plus'
import type { TokenPair } from '@/types/ssgl'

const API_BASE = import.meta.env.VITE_API_URL || '/'
export const SSGL_API_BASE = '/api/v1'
export const SSGL_AI_BASE = '/ai/api/v1'

export function getAccessToken(): string | null {
  return localStorage.getItem('access_token')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token')
}

export function setTokens(tokens: TokenPair): void {
  localStorage.setItem('access_token', tokens.access_token)
  localStorage.setItem('refresh_token', tokens.refresh_token)
}

export function clearTokens(): void {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

function createApiInstance(baseURL: string): AxiosInstance {
  const instance = axios.create({
    baseURL,
    headers: { 'Content-Type': 'application/json' }
  })

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = getAccessToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error) => {
      const originalRequest = error.config

      if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
        originalRequest._retry = true
        const refreshToken = getRefreshToken()
        if (!refreshToken) {
          clearTokens()
          return Promise.reject(error)
        }

        try {
          const response = await axios.post(`${API_BASE}${SSGL_API_BASE}/auth/refresh`, {
            refresh_token: refreshToken
          })
          const tokens = response.data as TokenPair
          setTokens(tokens)
          originalRequest.headers.Authorization = `Bearer ${tokens.access_token}`
          return instance(originalRequest)
        } catch (refreshError) {
          clearTokens()
          return Promise.reject(refreshError)
        }
      }

      if (error.response?.status === 403) {
        ElMessage.error('权限不足')
      }

      return Promise.reject(error)
    }
  )

  return instance
}

export const api = createApiInstance(SSGL_API_BASE)
export const aiApi = createApiInstance(SSGL_AI_BASE)
```

- [ ] **Step 4: Create auth API**

Create `frontend-vue/src/api/auth.ts`:

```ts
import type { LoginRequest, LoginResponse, TokenPair, User } from '@/types/ssgl'
import { api, clearTokens, setTokens } from './http'

export const authAPI = {
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await api.post<LoginResponse>('/auth/login', credentials)
    if (response.data.tokens) {
      setTokens(response.data.tokens)
    }
    return response.data
  },

  async refresh(refreshToken: string): Promise<TokenPair> {
    const response = await api.post<TokenPair>('/auth/refresh', { refresh_token: refreshToken })
    setTokens(response.data)
    return response.data
  },

  async getMe(): Promise<{ user: User }> {
    const response = await api.get<{ user: User }>('/users/me')
    return response.data
  },

  logout(): void {
    clearTokens()
  }
}
```

- [ ] **Step 5: Create business API index**

Create `frontend-vue/src/api/ssgl.ts` by porting these export objects from `frontend-vite/src/services/api.ts` and replacing React imports with `@/types/ssgl`:

```text
competitionsAPI
milestonesAPI
teamsAPI
subscriptionsAPI
workflowsAPI
prePlansAPI
awardsAPI
evaluationsAPI
registrationsAPI
statsAPI
systemAPI
auditAPI
calendarAPI
notificationsAPI
searchAPI
profileAPI
pointsAPI
comparisonAPI
growthAPI
learningPathAPI
notesAPI
feedbackAPI
```

Use this request pattern:

```ts
export const competitionsAPI = {
  async list(params?: Record<string, string>): Promise<{ competitions: Competition[] }> {
    const response = await api.get<{ competitions: Competition[] }>('/competitions', { params })
    return response.data
  }
}
```

- [ ] **Step 6: Create AI API module**

Create `frontend-vue/src/api/ai.ts` by porting:

```text
aiToolsAPI
assistantAPI
executionMatchAPI
coachAPI
ragAPI
```

Keep stream calls on `fetch` with `getAccessToken()`:

```ts
import { aiApi, getAccessToken, SSGL_AI_BASE } from './http'

function authHeaders(): HeadersInit {
  const token = getAccessToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}
```

- [ ] **Step 7: Export API modules**

Create `frontend-vue/src/api/index.ts`:

```ts
export * from './auth'
export * from './ssgl'
export * from './ai'
export * from './http'
```

- [ ] **Step 8: Run tests and build**

Run:

```powershell
pnpm test
pnpm build
```

Expected: all tests pass and build exits with code 0.

- [ ] **Step 9: Commit API layer**

Run:

```powershell
git add frontend-vue/src/types/ssgl.ts frontend-vue/src/api frontend-vue/package.json frontend-vue/pnpm-lock.yaml
git commit -m "feat: add ssgl api client layer"
```

---

### Task 4: Replace Template Auth With SSGL Auth

**Files:**
- Modify: `frontend-vue/src/store/modules/user.ts`
- Modify: `frontend-vue/src/views/auth/login/index.vue`
- Modify: `frontend-vue/src/api/auth.ts`
- Modify: `frontend-vue/src/router/guards/beforeEach.ts`
- Create: `frontend-vue/src/store/modules/user.test.ts`

- [ ] **Step 1: Write user store test**

Create `frontend-vue/src/store/modules/user.test.ts`:

```ts
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useUserStore } from './user'

describe('SSGL user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores user role and exposes roles array for menu filtering', () => {
    const store = useUserStore()
    store.setUserInfo({
      id: 1,
      username: 'liuzy',
      email: 'liuzy@example.com',
      role: 'admin',
      name: '刘老师',
      status: 'active',
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z'
    })

    expect(store.info.role).toBe('admin')
    expect(store.roles).toEqual(['admin'])
  })
})
```

- [ ] **Step 2: Update user store state**

Modify `frontend-vue/src/store/modules/user.ts` so the store uses SSGL user fields. Preserve language, lock, worktab cleanup, and logout behavior from Art Design Pro. The user-specific state must include:

```ts
const info = ref<Partial<User>>({})
const roles = computed(() => (info.value.role ? [info.value.role] : []))
const accessToken = ref('')
const refreshToken = ref('')

const setUserInfo = (newInfo: User) => {
  info.value = newInfo
}

const setToken = (newAccessToken: string, newRefreshToken?: string) => {
  accessToken.value = newAccessToken
  localStorage.setItem('access_token', newAccessToken)
  if (newRefreshToken) {
    refreshToken.value = newRefreshToken
    localStorage.setItem('refresh_token', newRefreshToken)
  }
}
```

Update logout to call `authAPI.logout()` or remove both SSGL localStorage tokens before navigating to `Login`.

- [ ] **Step 3: Update login page payload**

Modify `frontend-vue/src/views/auth/login/index.vue`:

- Remove the demo account selector.
- Keep username and password fields.
- Remove drag verification from the required login path.
- Submit `{ username, password }` to `authAPI.login`.
- Store `tokens.access_token`, `tokens.refresh_token`, and `user`.
- Redirect to `route.query.redirect || '/dashboard'`.

The submit block should use this shape:

```ts
const { username, password } = formData
const { tokens, user } = await authAPI.login({ username, password })
userStore.setToken(tokens.access_token, tokens.refresh_token)
userStore.setUserInfo(user)
userStore.setLoginStatus(true)
router.push((route.query.redirect as string) || '/dashboard')
```

- [ ] **Step 4: Update guard user fetch**

Modify `fetchUserInfo()` in `frontend-vue/src/router/guards/beforeEach.ts`:

```ts
async function fetchUserInfo(): Promise<void> {
  const userStore = useUserStore()
  const data = await authAPI.getMe()
  userStore.setUserInfo(data.user)
  userStore.checkAndClearWorktabs()
}
```

Import `authAPI` from `@/api/auth` and remove `fetchGetUserInfo`.

- [ ] **Step 5: Run auth tests**

Run:

```powershell
pnpm test src/store/modules/user.test.ts src/api/http.test.ts
pnpm build
```

Expected: tests pass and build exits with code 0.

- [ ] **Step 6: Commit auth migration**

Run:

```powershell
git add frontend-vue/src/store/modules/user.ts frontend-vue/src/store/modules/user.test.ts frontend-vue/src/views/auth/login/index.vue frontend-vue/src/router/guards/beforeEach.ts frontend-vue/src/api/auth.ts
git commit -m "feat: wire vue auth to ssgl backend"
```

---

### Task 5: Add SSGL Routes, Menus, And Role Filtering

**Files:**
- Create: `frontend-vue/src/router/modules/ssgl.ts`
- Modify: `frontend-vue/src/router/modules/index.ts`
- Modify: `frontend-vue/src/router/routes/staticRoutes.ts`
- Modify: `frontend-vue/src/router/routesAlias.ts`
- Create: `frontend-vue/src/router/modules/ssgl.test.ts`
- Create: `frontend-vue/src/views/ssgl/**/index.vue` route shells for all pages

- [ ] **Step 1: Write route coverage test**

Create `frontend-vue/src/router/modules/ssgl.test.ts`:

```ts
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
})
```

- [ ] **Step 2: Create route shells**

Create these files with an Element Plus empty state that includes the page title and a `data-page` attribute matching the route key:

```text
frontend-vue/src/views/ssgl/dashboard/index.vue
frontend-vue/src/views/ssgl/competitions/index.vue
frontend-vue/src/views/ssgl/teams/index.vue
frontend-vue/src/views/ssgl/calendar/index.vue
frontend-vue/src/views/ssgl/approvals/index.vue
frontend-vue/src/views/ssgl/preplans/index.vue
frontend-vue/src/views/ssgl/registrations/index.vue
frontend-vue/src/views/ssgl/awards/index.vue
frontend-vue/src/views/ssgl/evaluations/index.vue
frontend-vue/src/views/ssgl/stats/index.vue
frontend-vue/src/views/ssgl/analytics/index.vue
frontend-vue/src/views/ssgl/kanban/index.vue
frontend-vue/src/views/ssgl/insights/index.vue
frontend-vue/src/views/ssgl/leaderboard/index.vue
frontend-vue/src/views/ssgl/showcase/index.vue
frontend-vue/src/views/ssgl/achievement-gallery/index.vue
frontend-vue/src/views/ssgl/points/index.vue
frontend-vue/src/views/ssgl/compare/index.vue
frontend-vue/src/views/ssgl/growth/index.vue
frontend-vue/src/views/ssgl/learning-path/index.vue
frontend-vue/src/views/ssgl/annual-report/index.vue
frontend-vue/src/views/ssgl/aitools/index.vue
frontend-vue/src/views/ssgl/coach/index.vue
frontend-vue/src/views/ssgl/assistant/index.vue
frontend-vue/src/views/ssgl/execution-match/index.vue
frontend-vue/src/views/ssgl/knowledge-base/index.vue
frontend-vue/src/views/ssgl/audit-logs/index.vue
frontend-vue/src/views/ssgl/diagnostics/index.vue
frontend-vue/src/views/ssgl/notifications/index.vue
frontend-vue/src/views/ssgl/profile/index.vue
frontend-vue/src/views/ssgl/feedback/index.vue
```

Use this shell for each file, changing `name`, `data-page`, and title:

```vue
<template>
  <section class="ssgl-page" data-page="competitions">
    <ElEmpty description="赛事管理正在迁移到 Vue 版" />
  </section>
</template>

<script setup lang="ts">
  defineOptions({ name: 'SSGLCompetitions' })
</script>
```

- [ ] **Step 3: Create route module**

Create `frontend-vue/src/router/modules/ssgl.ts` with role-aware top-level routes. Keep every SSGL business URL equal to the React URL, such as `/competitions` and `/teams`. Store the visual menu section in `meta.group`; the sidebar customization in Task 11 can use it for grouped rendering without changing routes:

```ts
import type { AppRouteRecord } from '@/types/router'

const allRoles = ['student', 'teacher', 'admin']
const teacherAdmin = ['teacher', 'admin']
const adminOnly = ['admin']

function page(
  name: string,
  path: string,
  title: string,
  icon: string,
  roles: string[],
  group: string,
  fixedTab = false
): AppRouteRecord {
  return {
    name,
    path,
    component: `/ssgl${path}`,
    meta: { title, icon, roles, group, fixedTab }
  }
}

export const ssglRoutes: AppRouteRecord[] = [
  page('Dashboard', '/dashboard', '概览', 'ri:dashboard-line', allRoles, '概览', true),
  page('Competitions', '/competitions', '赛事管理', 'ri:trophy-line', allRoles, '赛事运营'),
  page('Calendar', '/calendar', '赛事日历', 'ri:calendar-line', allRoles, '赛事运营'),
  page('Teams', '/teams', '团队管理', 'ri:team-line', allRoles, '赛事运营'),
  page('Approvals', '/approvals', '审批中心', 'ri:checkbox-line', teacherAdmin, '流程审批'),
  page('Preplans', '/preplans', '预案管理', 'ri:file-list-3-line', allRoles, '流程审批'),
  page('Registrations', '/registrations', '报名管理', 'ri:file-user-line', teacherAdmin, '流程审批'),
  page('Awards', '/awards', '获奖管理', 'ri:gift-line', teacherAdmin, '流程审批'),
  page('Evaluations', '/evaluations', '学生评价', 'ri:star-line', allRoles, '流程审批'),
  page('Feedback', '/feedback', '赛事反馈', 'ri:message-3-line', allRoles, '流程审批'),
  page('Stats', '/stats', '统计分析', 'ri:bar-chart-line', teacherAdmin, '数据洞察'),
  page('Analytics', '/analytics', '数据分析中心', 'ri:line-chart-line', allRoles, '数据洞察'),
  page('Kanban', '/kanban', '看板总览', 'ri:kanban-view', teacherAdmin, '数据洞察'),
  page('Insights', '/insights', 'AI 洞察', 'ri:lightbulb-line', teacherAdmin, '数据洞察'),
  page('Leaderboard', '/leaderboard', '排行榜', 'ri:trophy-line', allRoles, '数据洞察'),
  page('Showcase', '/showcase', '成果展示', 'ri:award-line', allRoles, '数据洞察'),
  page('AchievementGallery', '/achievement-gallery', '成就展示墙', 'ri:medal-line', allRoles, '数据洞察'),
  page('Points', '/points', '积分成就', 'ri:star-smile-line', allRoles, '数据洞察'),
  page('Compare', '/compare', '赛事对比', 'ri:git-compare-line', allRoles, '数据洞察'),
  page('Growth', '/growth', '成长档案', 'ri:seedling-line', ['student'], '数据洞察'),
  page('LearningPath', '/learning-path', '学习路径', 'ri:map-2-line', allRoles, '数据洞察'),
  page('AnnualReport', '/annual-report', '年度报告', 'ri:file-chart-line', teacherAdmin, '数据洞察'),
  page('AITools', '/aitools', 'AI 工具箱', 'ri:magic-line', allRoles, '智能助手'),
  page('Coach', '/coach', '赛事陪练', 'ri:target-line', allRoles, '智能助手'),
  page('Assistant', '/assistant', 'AI 助手', 'ri:robot-2-line', allRoles, '智能助手'),
  page('ExecutionMatch', '/execution-match', '执行匹配', 'ri:survey-line', allRoles, '智能助手'),
  page('KnowledgeBase', '/knowledge-base', '知识库管理', 'ri:database-2-line', allRoles, '智能助手'),
  page('AuditLogs', '/audit-logs', '审计日志', 'ri:shield-check-line', adminOnly, '系统管理'),
  page('Diagnostics', '/diagnostics', '系统诊断', 'ri:pulse-line', adminOnly, '系统管理'),
  page('Notifications', '/notifications', '通知中心', 'ri:notification-3-line', allRoles, '账户'),
  page('Profile', '/profile', '个人中心', 'ri:user-settings-line', allRoles, '账户')
]
```

- [ ] **Step 4: Replace exported route modules**

Modify `frontend-vue/src/router/modules/index.ts`:

```ts
import { AppRouteRecord } from '@/types/router'
import { ssglRoutes } from './ssgl'
import { resultRoutes } from './result'
import { exceptionRoutes } from './exception'

export const routeModules: AppRouteRecord[] = [
  ...ssglRoutes,
  resultRoutes,
  exceptionRoutes
]
```

- [ ] **Step 5: Set route aliases**

Modify `frontend-vue/src/router/routesAlias.ts`:

```ts
export enum RoutesAlias {
  Layout = '/index/index',
  Login = '/auth/login'
}
```

Ensure `HOME_PAGE_PATH` in `frontend-vue/src/router/index.ts` resolves to `/dashboard` or remains empty if the menu processor redirects to `/dashboard`.

- [ ] **Step 6: Run route test and build**

Run:

```powershell
pnpm test src/router/modules/ssgl.test.ts
pnpm build
```

Expected: test passes and build exits with code 0.

- [ ] **Step 7: Commit routes**

Run:

```powershell
git add frontend-vue/src/router frontend-vue/src/views/ssgl
git commit -m "feat: add ssgl vue routes and menu"
```

---

### Task 6: Add Shared SSGL Vue Components And Composables

**Files:**
- Create: `frontend-vue/src/components/ssgl/SSGLPageHeader.vue`
- Create: `frontend-vue/src/components/ssgl/SSGLStatCard.vue`
- Create: `frontend-vue/src/components/ssgl/SSGLStatusTag.vue`
- Create: `frontend-vue/src/components/ssgl/SSGLEmptyState.vue`
- Create: `frontend-vue/src/components/ssgl/SSGLStreamOutput.vue`
- Create: `frontend-vue/src/composables/ssgl/useAsyncState.ts`
- Create: `frontend-vue/src/composables/ssgl/usePagination.ts`
- Create: `frontend-vue/src/composables/ssgl/useNotifications.ts`
- Create: `frontend-vue/src/composables/ssgl/useSSEStream.ts`
- Create: `frontend-vue/src/components/ssgl/SSGLStatusTag.test.ts`

- [ ] **Step 1: Write status tag test**

Create `frontend-vue/src/components/ssgl/SSGLStatusTag.test.ts`:

```ts
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import SSGLStatusTag from './SSGLStatusTag.vue'

describe('SSGLStatusTag', () => {
  it('renders known status labels', () => {
    const wrapper = mount(SSGLStatusTag, {
      props: { status: 'published' }
    })
    expect(wrapper.text()).toContain('已发布')
  })
})
```

- [ ] **Step 2: Create status tag**

Create `frontend-vue/src/components/ssgl/SSGLStatusTag.vue`:

```vue
<template>
  <ElTag :type="meta.type" effect="light" round>
    {{ meta.label }}
  </ElTag>
</template>

<script setup lang="ts">
  const props = defineProps<{ status: string }>()

  const statusMap: Record<string, { label: string; type: '' | 'success' | 'warning' | 'info' | 'danger' }> = {
    draft: { label: '草稿', type: 'info' },
    published: { label: '已发布', type: 'success' },
    ongoing: { label: '进行中', type: 'warning' },
    completed: { label: '已完成', type: 'success' },
    cancelled: { label: '已取消', type: 'danger' },
    pending: { label: '待处理', type: 'warning' },
    approved: { label: '已通过', type: 'success' },
    rejected: { label: '已驳回', type: 'danger' },
    active: { label: '正常', type: 'success' },
    disabled: { label: '禁用', type: 'danger' }
  }

  const meta = computed(() => statusMap[props.status] ?? { label: props.status, type: 'info' })
</script>
```

- [ ] **Step 3: Create page header**

Create `frontend-vue/src/components/ssgl/SSGLPageHeader.vue`:

```vue
<template>
  <div class="ssgl-page-header">
    <div>
      <h1>{{ title }}</h1>
      <p v-if="subtitle">{{ subtitle }}</p>
    </div>
    <div v-if="$slots.actions" class="ssgl-page-header__actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
  defineProps<{ title: string; subtitle?: string }>()
</script>

<style scoped lang="scss">
  .ssgl-page-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 16px;

    h1 {
      margin: 0;
      font-size: 22px;
      font-weight: 700;
      color: var(--art-gray-900);
    }

    p {
      margin: 6px 0 0;
      color: var(--art-gray-600);
    }
  }
</style>
```

- [ ] **Step 4: Create async and pagination composables**

Create `frontend-vue/src/composables/ssgl/useAsyncState.ts`:

```ts
export function useAsyncState<T>(loader: () => Promise<T>) {
  const data = shallowRef<T | null>(null)
  const loading = ref(false)
  const error = ref<unknown>(null)

  async function execute() {
    loading.value = true
    error.value = null
    try {
      data.value = await loader()
      return data.value
    } catch (err) {
      error.value = err
      throw err
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
```

Create `frontend-vue/src/composables/ssgl/usePagination.ts`:

```ts
export function usePagination(pageSize = 20) {
  const page = ref(1)
  const total = ref(0)

  const params = computed(() => ({
    page: String(page.value),
    page_size: String(pageSize)
  }))

  function setTotal(value: number) {
    total.value = value
  }

  function reset() {
    page.value = 1
    total.value = 0
  }

  return { page, total, pageSize, params, setTotal, reset }
}
```

- [ ] **Step 5: Create notification and streaming composables**

Create `frontend-vue/src/composables/ssgl/useNotifications.ts` using `notificationsAPI.getUnreadCount()` and `workflowsAPI.list({ tab: 'pending' })`, matching the React hook behavior.

Create `frontend-vue/src/composables/ssgl/useSSEStream.ts`:

```ts
export function useSSEStream() {
  const output = ref('')
  const loading = ref(false)
  const error = ref('')

  function reset() {
    output.value = ''
    error.value = ''
    loading.value = false
  }

  async function run(handler: (events: {
    onChunk: (text: string) => void
    onDone: () => void
    onError: (message: string) => void
  }) => Promise<void>) {
    reset()
    loading.value = true
    await handler({
      onChunk: (text) => {
        output.value += text
      },
      onDone: () => {
        loading.value = false
      },
      onError: (message) => {
        error.value = message
        loading.value = false
      }
    })
  }

  return { output, loading, error, reset, run }
}
```

- [ ] **Step 6: Run component tests and build**

Run:

```powershell
pnpm test src/components/ssgl/SSGLStatusTag.test.ts
pnpm build
```

Expected: tests pass and build exits with code 0.

- [ ] **Step 7: Commit shared UI**

Run:

```powershell
git add frontend-vue/src/components/ssgl frontend-vue/src/composables/ssgl
git commit -m "feat: add shared ssgl vue components"
```

---

### Task 7: Migrate Core Competition Operations Pages

**Files:**
- Modify: `frontend-vue/src/views/ssgl/competitions/index.vue`
- Modify: `frontend-vue/src/views/ssgl/teams/index.vue`
- Modify: `frontend-vue/src/views/ssgl/calendar/index.vue`
- Create: `frontend-vue/src/views/ssgl/competitions/CompetitionDialog.vue`
- Create: `frontend-vue/src/views/ssgl/teams/TeamDialog.vue`
- Reference: `frontend-vite/src/pages/competitions.tsx`
- Reference: `frontend-vite/src/pages/teams.tsx`
- Reference: `frontend-vite/src/pages/calendar.tsx`

- [ ] **Step 1: Migrate competitions page**

Replace the route shell with a real Vue page that:

- Calls `competitionsAPI.list()`.
- Renders filters for title/type/status.
- Renders an `ElTable` with title, type, status, registration deadline, start/end dates, teams count, and actions.
- Supports create, update, delete, publish, difficulty, import, and recommendations where present in the React page.
- Uses `CompetitionDialog.vue` for create and edit.

Use this top-level structure:

```vue
<template>
  <section class="ssgl-page" data-page="competitions">
    <SSGLPageHeader title="赛事管理" subtitle="创建、发布和维护学科竞赛信息">
      <template #actions>
        <ElButton type="primary" @click="openCreate">新建赛事</ElButton>
      </template>
    </SSGLPageHeader>

    <ElCard shadow="never">
      <ElTable v-loading="loading" :data="competitions" row-key="id">
        <ElTableColumn prop="title" label="赛事名称" min-width="220" />
        <ElTableColumn prop="type" label="类型" width="130" />
        <ElTableColumn label="状态" width="110">
          <template #default="{ row }">
            <SSGLStatusTag :status="row.status" />
          </template>
        </ElTableColumn>
        <ElTableColumn prop="registration_deadline" label="报名截止" width="170" />
        <ElTableColumn prop="teams_count" label="团队数" width="90" />
        <ElTableColumn label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <ElButton link type="primary" @click="openEdit(row)">编辑</ElButton>
            <ElButton link type="success" @click="publish(row)">发布</ElButton>
            <ElButton link type="danger" @click="remove(row)">删除</ElButton>
          </template>
        </ElTableColumn>
      </ElTable>
    </ElCard>

    <CompetitionDialog v-model="dialogOpen" :competition="selected" @saved="load" />
  </section>
</template>
```

- [ ] **Step 2: Migrate teams page**

Replace the route shell with a real Vue page that:

- Calls `teamsAPI.list()` and `competitionsAPI.list()`.
- Renders team name, competition, leader, member count, status, and actions.
- Supports create, update, delete, join, leave, invites, and team analysis where present in the React page.
- Uses `TeamDialog.vue` for create and edit.

- [ ] **Step 3: Migrate calendar page**

Replace the route shell with a real Vue page that:

- Calls `calendarAPI.list(month)`.
- Renders an Element Plus calendar or date-grouped event list.
- Shows event title, status, date range, location, and tags.
- Supports `calendarAPI.exportICS()` with file download.

- [ ] **Step 4: Run build**

Run:

```powershell
pnpm build
```

Expected: build exits with code 0.

- [ ] **Step 5: Commit competition operations**

Run:

```powershell
git add frontend-vue/src/views/ssgl/competitions frontend-vue/src/views/ssgl/teams frontend-vue/src/views/ssgl/calendar
git commit -m "feat: migrate competition operations to vue"
```

---

### Task 8: Migrate Workflow And Review Pages

**Files:**
- Modify: `frontend-vue/src/views/ssgl/approvals/index.vue`
- Modify: `frontend-vue/src/views/ssgl/preplans/index.vue`
- Modify: `frontend-vue/src/views/ssgl/registrations/index.vue`
- Modify: `frontend-vue/src/views/ssgl/awards/index.vue`
- Modify: `frontend-vue/src/views/ssgl/evaluations/index.vue`
- Modify: `frontend-vue/src/views/ssgl/feedback/index.vue`
- Reference: matching React pages in `frontend-vite/src/pages/`

- [ ] **Step 1: Migrate approvals**

Use `workflowsAPI.list()`, `workflowsAPI.approve()`, and `workflowsAPI.reject()`. Render pending/approved/rejected tabs, workflow target title, submitter, step progress, current status, and approve/reject dialogs with comments.

- [ ] **Step 2: Migrate preplans**

Use `prePlansAPI.list()`, `prePlansAPI.create()`, `prePlansAPI.update()`, and `prePlansAPI.review()`. Render competition/team filters, status, AI review score, AI notes, submit/review actions, and the preplan editor form.

- [ ] **Step 3: Migrate registrations**

Use `registrationsAPI.list()`, approve/reject, batch approve/reject, competition registration list, register, and deregister endpoints. Preserve teacher/admin review controls and student registration controls from the React page.

- [ ] **Step 4: Migrate awards**

Use `awardsAPI.list()`, `awardsAPI.create()`, and `awardsAPI.settle()`. Render competition/team/rank/prize/status and settlement actions.

- [ ] **Step 5: Migrate evaluations and feedback**

Use `evaluationsAPI` and `feedbackAPI`. Render rating forms with Element Plus rate controls, feedback summaries, rating distribution, top skills, and delete behavior where available.

- [ ] **Step 6: Run build**

Run:

```powershell
pnpm build
```

Expected: build exits with code 0.

- [ ] **Step 7: Commit workflow pages**

Run:

```powershell
git add frontend-vue/src/views/ssgl/approvals frontend-vue/src/views/ssgl/preplans frontend-vue/src/views/ssgl/registrations frontend-vue/src/views/ssgl/awards frontend-vue/src/views/ssgl/evaluations frontend-vue/src/views/ssgl/feedback
git commit -m "feat: migrate workflow pages to vue"
```

---

### Task 9: Migrate Dashboard And Data Insight Pages

**Files:**
- Modify: `frontend-vue/src/views/ssgl/dashboard/index.vue`
- Modify: `frontend-vue/src/views/ssgl/stats/index.vue`
- Modify: `frontend-vue/src/views/ssgl/analytics/index.vue`
- Modify: `frontend-vue/src/views/ssgl/kanban/index.vue`
- Modify: `frontend-vue/src/views/ssgl/insights/index.vue`
- Modify: `frontend-vue/src/views/ssgl/leaderboard/index.vue`
- Modify: `frontend-vue/src/views/ssgl/showcase/index.vue`
- Modify: `frontend-vue/src/views/ssgl/achievement-gallery/index.vue`
- Modify: `frontend-vue/src/views/ssgl/points/index.vue`
- Modify: `frontend-vue/src/views/ssgl/compare/index.vue`
- Modify: `frontend-vue/src/views/ssgl/growth/index.vue`
- Modify: `frontend-vue/src/views/ssgl/learning-path/index.vue`
- Modify: `frontend-vue/src/views/ssgl/annual-report/index.vue`

- [ ] **Step 1: Migrate dashboard**

Use `useUserStore().info.role` to select admin, teacher, or student dashboard content. Port the data calls and cards from:

```text
frontend-vite/src/pages/dashboard.tsx
frontend-vite/src/pages/dashboard/admin.tsx
frontend-vite/src/pages/dashboard/teacher.tsx
frontend-vite/src/pages/dashboard/student.tsx
```

Render overview cards with `SSGLStatCard` and charts with Art Design Pro chart components or ECharts.

- [ ] **Step 2: Migrate stats, analytics, and kanban**

Use `statsAPI.overview()`, `statsAPI.competitions()`, `statsAPI.teachers()`, `statsAPI.trends()`, `statsAPI.students()`, `statsAPI.progress()`, `statsAPI.typeDistribution()`, `statsAPI.recentActivity()`, and kanban data APIs already present in `statsAPI`. Preserve export actions from the React page.

- [ ] **Step 3: Migrate insights and ranking pages**

Use existing APIs for insights, leaderboard, showcase, achievement gallery, points, and compare. Render tables, cards, and chart summaries with Element Plus and Art Design Pro cards.

- [ ] **Step 4: Migrate student growth pages**

Use `growthAPI.getProfile()` and `learningPathAPI.getPath()`. Render timeline, skills, recommendations, learning phases, goals, and resources. Keep teacher/admin access behavior for annual report as route metadata already defines.

- [ ] **Step 5: Run build**

Run:

```powershell
pnpm build
```

Expected: build exits with code 0.

- [ ] **Step 6: Commit data pages**

Run:

```powershell
git add frontend-vue/src/views/ssgl/dashboard frontend-vue/src/views/ssgl/stats frontend-vue/src/views/ssgl/analytics frontend-vue/src/views/ssgl/kanban frontend-vue/src/views/ssgl/insights frontend-vue/src/views/ssgl/leaderboard frontend-vue/src/views/ssgl/showcase frontend-vue/src/views/ssgl/achievement-gallery frontend-vue/src/views/ssgl/points frontend-vue/src/views/ssgl/compare frontend-vue/src/views/ssgl/growth frontend-vue/src/views/ssgl/learning-path frontend-vue/src/views/ssgl/annual-report
git commit -m "feat: migrate dashboard and insight pages to vue"
```

---

### Task 10: Migrate AI And Knowledge Pages

**Files:**
- Modify: `frontend-vue/src/views/ssgl/aitools/index.vue`
- Modify: `frontend-vue/src/views/ssgl/coach/index.vue`
- Modify: `frontend-vue/src/views/ssgl/assistant/index.vue`
- Modify: `frontend-vue/src/views/ssgl/execution-match/index.vue`
- Modify: `frontend-vue/src/views/ssgl/knowledge-base/index.vue`
- Create: `frontend-vue/src/components/ssgl/SSGLRadarChart.vue`
- Reference: `frontend-vite/src/components/ai/radar.tsx`
- Reference: `frontend-vite/src/components/ai/assistant.tsx`

- [ ] **Step 1: Migrate AI tools**

Use `aiToolsAPI.call()` and `aiToolsAPI.callStream()`. Render tool selection, input textarea, optional extra context, streaming result, loading state, and error messages.

- [ ] **Step 2: Migrate coach**

Use `coachAPI.start()`, `coachAPI.answerStream()`, and `coachAPI.final()`. Render competition/preplan source selection, generated questions, streaming answer feedback, final score, verdict, and radar dimensions.

- [ ] **Step 3: Create radar chart component**

Create `frontend-vue/src/components/ssgl/SSGLRadarChart.vue` using ECharts radar series. Props:

```ts
defineProps<{
  dimensions: Array<{ label: string; score: number }>
  size?: number
}>()
```

Use it in coach and preplan review pages.

- [ ] **Step 4: Migrate assistant**

Use `assistantAPI.chat()`, `assistantAPI.chatStream()`, and `assistantAPI.quickAction()`. Render message history, page context, suggestions, tool call chips, and streaming output.

- [ ] **Step 5: Migrate execution match and knowledge base**

Use `executionMatchAPI.match()` and `ragAPI` methods. Preserve upload, batch upload, query, search, document listing, chunk listing, and delete behavior from the React page.

- [ ] **Step 6: Run build**

Run:

```powershell
pnpm build
```

Expected: build exits with code 0.

- [ ] **Step 7: Commit AI pages**

Run:

```powershell
git add frontend-vue/src/views/ssgl/aitools frontend-vue/src/views/ssgl/coach frontend-vue/src/views/ssgl/assistant frontend-vue/src/views/ssgl/execution-match frontend-vue/src/views/ssgl/knowledge-base frontend-vue/src/components/ssgl/SSGLRadarChart.vue
git commit -m "feat: migrate ai workflows to vue"
```

---

### Task 11: Migrate Account, Admin, Topbar, And Search

**Files:**
- Modify: `frontend-vue/src/views/ssgl/audit-logs/index.vue`
- Modify: `frontend-vue/src/views/ssgl/diagnostics/index.vue`
- Modify: `frontend-vue/src/views/ssgl/notifications/index.vue`
- Modify: `frontend-vue/src/views/ssgl/profile/index.vue`
- Modify: `frontend-vue/src/components/core/layouts/art-header-bar/index.vue`
- Modify: `frontend-vue/src/components/core/layouts/art-menus/art-sidebar-menu/index.vue`
- Modify: `frontend-vue/src/components/core/layouts/art-global-search/index.vue`
- Modify: `frontend-vue/src/components/core/layouts/art-notification/index.vue`
- Modify: `frontend-vue/src/config/modules/headerBar.ts`

- [ ] **Step 1: Migrate admin pages**

Use `auditAPI.list()`, `auditAPI.stats()`, and `systemAPI` diagnostic methods from the ported API layer. Render paginated audit logs, method/status filters, duration, request ID, body preview, diagnostic cards, and system check actions.

- [ ] **Step 2: Migrate notifications**

Use `notificationsAPI.list()`, `notificationsAPI.getUnreadCount()`, `notificationsAPI.markRead()`, and `notificationsAPI.markAllRead()`. Render read/unread state, pagination, and mark-read actions.

- [ ] **Step 3: Migrate profile**

Use `profileAPI.getMyProfile()`, `profileAPI.updateProfile()`, `profileAPI.searchUsers()`, and `profileAPI.myActivity()`. Render editable profile form, role metadata, activity list, and summary counts.

- [ ] **Step 4: Wire global search**

Modify Art Design Pro global search to call `searchAPI.search(query)` and navigate:

```text
competition -> /competitions
team -> /teams
user -> /profile
```

Preserve keyboard opening behavior from the template.

- [ ] **Step 5: Render SSGL menu groups**

Modify `frontend-vue/src/components/core/layouts/art-menus/art-sidebar-menu/index.vue` so it groups visible menu items by `item.meta.group` when the menu item has no children. Render group labels in this order:

```text
概览
赛事运营
流程审批
数据洞察
智能助手
系统管理
账户
```

Keep Art Design Pro's collapsed sidebar behavior. When collapsed, hide group labels and show only icons.

- [ ] **Step 6: Wire notification badge**

Modify Art Design Pro notification component to use `useNotifications()` from `src/composables/ssgl/useNotifications.ts`. Show unread and pending counts in header controls.

- [ ] **Step 7: Configure header features**

In `frontend-vue/src/config/modules/headerBar.ts`, keep useful features enabled:

```ts
globalSearch: { enabled: true, description: '全局搜索' }
notification: { enabled: true, description: '通知中心' }
chat: { enabled: false, description: '由 SSGL AI 助手页面承载' }
language: { enabled: false, description: 'SSGL 当前只启用中文界面' }
settings: { enabled: true, description: '系统设置面板' }
themeToggle: { enabled: true, description: '主题切换' }
```

- [ ] **Step 8: Run build**

Run:

```powershell
pnpm build
```

Expected: build exits with code 0.

- [ ] **Step 9: Commit account and admin pages**

Run:

```powershell
git add frontend-vue/src/views/ssgl/audit-logs frontend-vue/src/views/ssgl/diagnostics frontend-vue/src/views/ssgl/notifications frontend-vue/src/views/ssgl/profile frontend-vue/src/components/core/layouts frontend-vue/src/config/modules/headerBar.ts
git commit -m "feat: migrate account and admin workflows to vue"
```

---

### Task 12: Remove Demo Navigation And Brand The Shell

**Files:**
- Modify: `frontend-vue/src/config/index.ts`
- Modify: `frontend-vue/src/components/core/base/art-logo/index.vue`
- Modify: `frontend-vue/src/router/modules/index.ts`
- Modify: `frontend-vue/src/locales/langs/zh.json`
- Modify: `frontend-vue/src/locales/langs/en.json`

- [ ] **Step 1: Rename product**

Set system name in `frontend-vue/src/config/index.ts`:

```ts
systemInfo: {
  name: 'SSGL 竞赛管理'
}
```

- [ ] **Step 2: Confirm demo menus are not exported**

Verify `frontend-vue/src/router/modules/index.ts` only exports:

```text
ssglRoutes
resultRoutes
exceptionRoutes
```

Do not export template, widgets, examples, article, safeguard, help, or system demo route modules.

- [ ] **Step 3: Update visible locale strings**

Update login and system strings in locale files so visible user-facing text says SSGL instead of Art Design Pro. Keep untranslated internal route titles if they are not visible in SSGL navigation.

- [ ] **Step 4: Run build**

Run:

```powershell
pnpm build
```

Expected: build exits with code 0.

- [ ] **Step 5: Commit shell cleanup**

Run:

```powershell
git add frontend-vue/src/config/index.ts frontend-vue/src/components/core/base/art-logo/index.vue frontend-vue/src/router/modules/index.ts frontend-vue/src/locales
git commit -m "chore: brand vue shell for ssgl"
```

---

### Task 13: Full Manual Smoke Test

**Files:**
- Create: `frontend-vue/docs/smoke-test.md`

- [ ] **Step 1: Start backend services**

Run the Go backend and AI service using the existing project README instructions:

```powershell
cd D:\Code\ssgl\backend
go test ./...
```

Start the backend on port 8080 and AI service on port 8000 using the existing local commands for this project.

- [ ] **Step 2: Start Vue dev server**

Run:

```powershell
cd D:\Code\ssgl\frontend-vue
pnpm dev --port 5174
```

Expected: Vite starts on `http://localhost:5174`.

- [ ] **Step 3: Verify login and menus**

In the browser:

```text
Login with liuzy / admin123
Confirm redirect to /dashboard
Confirm admin menu includes audit logs and diagnostics
Logout
Login as teacher account from seeded data
Confirm teacher menu excludes audit logs and diagnostics
Login as student account from seeded data
Confirm student menu excludes teacher/admin-only pages
```

Record the accounts used and results in `frontend-vue/docs/smoke-test.md`.

- [ ] **Step 4: Verify route coverage**

Visit each business route from the menu and confirm:

```text
Page renders without console errors
Primary API request succeeds or shows a user-facing empty/error state
Tables do not overflow mobile width
Dialogs open and close
Forms validate required fields
Role-restricted routes redirect or deny access
```

Record failures with exact route, role, console error, and API response.

- [ ] **Step 5: Verify AI flows**

Verify:

```text
AI tools stream output
Assistant stream output
Coach starts a session and accepts an answer
Execution match returns scores
Knowledge base lists documents and handles upload/search
```

- [ ] **Step 6: Commit smoke test notes**

Run:

```powershell
git add frontend-vue/docs/smoke-test.md
git commit -m "test: document vue frontend smoke test"
```

---

### Task 14: Update Root Documentation And Scripts

**Files:**
- Modify: `README.md`
- Modify: `build_frontend.sh`
- Modify: `start_server.sh`
- Modify: `.gitignore`

- [ ] **Step 1: Update README frontend section**

Change the frontend tech stack from React to:

```text
Vue 3 + Vite + TypeScript + Element Plus + Pinia + Art Design Pro
```

Change startup commands to:

```bash
cd frontend-vue
pnpm install
pnpm dev --port 5174
```

Keep a note that `frontend-vite` is retained as the legacy React reference during the transition.

- [ ] **Step 2: Update frontend build script**

Modify `build_frontend.sh` so it builds `frontend-vue`:

```bash
#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/frontend-vue"
pnpm install
pnpm build
```

- [ ] **Step 3: Update server startup notes**

If `start_server.sh` prints frontend instructions or serves built assets, update the path from `frontend-vite/dist` to `frontend-vue/dist`.

- [ ] **Step 4: Ignore brainstorm artifacts**

Ensure `.gitignore` contains:

```text
.superpowers/
```

- [ ] **Step 5: Run final verification**

Run:

```powershell
cd D:\Code\ssgl\frontend-vue
pnpm test
pnpm build
cd D:\Code\ssgl\backend
go test ./...
```

Expected: all commands exit with code 0.

- [ ] **Step 6: Commit docs and scripts**

Run:

```powershell
git add README.md build_frontend.sh start_server.sh .gitignore
git commit -m "docs: switch primary frontend docs to vue"
```

---

## Final Verification

Run from `D:\Code\ssgl`:

```powershell
git status --short
cd frontend-vue
pnpm test
pnpm build
cd ..\backend
go test ./...
```

Expected:

```text
git status --short
```

prints no unstaged or uncommitted implementation files, and all test/build commands exit with code 0.

## Execution Notes

- Do not delete `frontend-vite` in this plan.
- Do not change Go backend response shapes.
- Do not keep Art Design Pro demo route modules in `routeModules`.
- Commit after each task.
- If a page exposes behavior that is unclear in React, read the matching React page and API export before coding that Vue page.
