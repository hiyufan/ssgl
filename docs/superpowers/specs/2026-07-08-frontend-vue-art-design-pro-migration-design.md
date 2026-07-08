# Frontend Vue Art Design Pro Migration Design

Date: 2026-07-08

## Summary

Migrate the SSGL frontend from the current React/Vite implementation to a full Vue 3 frontend based on the existing open-source Art Design Pro project at `D:\Code\art-design-pro`.

The new frontend will live in `D:\Code\ssgl\frontend-vue`. The current React frontend at `D:\Code\ssgl\frontend-vite` remains available as the reference implementation until the Vue version is complete and verified.

## Goals

- Build a complete Vue 3 replacement for the current React frontend.
- Use Art Design Pro as the base application shell, design system, layout, theme, routing, and component foundation.
- Preserve all existing SSGL business capabilities and backend integrations.
- Keep official business navigation focused on SSGL modules.
- Retain useful Art Design Pro examples and infrastructure as internal development references, but remove demo business pages from the user-facing menu.
- Avoid backend changes by adapting the Vue frontend to the current Go and AI service APIs.

## Non-Goals

- Do not embed React pages in the Vue app with iframe or micro-frontend techniques.
- Do not change Go backend routes or response formats for this migration.
- Do not delete `frontend-vite` during the initial migration.
- Do not keep Art Design Pro demo menus visible to SSGL users.

## Confirmed Decisions

- Migration direction: full Vue + Art Design Pro migration.
- Workspace strategy: create `frontend-vue` first, then switch project documentation and scripts after verification.
- Template demo handling: keep useful generic template pages and components as development references, but keep them out of the business menu.
- Completion target: all current React business pages must have Vue equivalents before the migration is considered complete.

## Architecture

`frontend-vue` will be created from `D:\Code\art-design-pro` and will keep its Vue 3 + Vite + TypeScript + Element Plus + Pinia + Vue Router architecture.

The SSGL-specific code will be organized around clear domain boundaries:

```text
frontend-vue/
  src/
    api/              # SSGL Go backend and AI service clients
    types/            # Business types migrated from frontend-vite
    store/modules/    # Pinia auth, user, menu, setting, notification state
    router/modules/   # SSGL business routes and role metadata
    views/ssgl/       # SSGL business pages
    components/ssgl/  # SSGL business components
```

The migration should use Art Design Pro's native layout, theme, page container, table, form, dialog, menu, tab, and chart patterns. React code should be treated as behavior and API reference, not as code to mechanically translate line by line.

## Routing And Permissions

The Vue app will use Art Design Pro's layout route, dynamic route registration, route guard, and menu generation model. Its template roles will be replaced with SSGL backend roles:

```text
student
teacher
admin
```

The login flow is:

```text
/auth/login
  -> POST /api/v1/auth/login
  -> store access_token and refresh_token
  -> GET /api/v1/users/me
  -> populate user state
  -> generate role-aware menu and routes
  -> navigate to /dashboard
```

Role rules follow the current React frontend:

- `audit-logs` and `diagnostics` are admin-only.
- `approvals`, `registrations`, `awards`, `stats`, `kanban`, `insights`, and `annual-report` require teacher or admin access.
- Shared pages such as competitions, teams, calendar, dashboards, AI tools, notifications, profile, and most data views remain available according to the current React behavior.
- Frontend guards provide UX-level protection; backend RBAC remains the security authority.

Business menu groups:

```text
概览
赛事运营：赛事、日历、团队
流程审批：审批、预案、报名、获奖
数据洞察：评价、统计、分析、看板、排行榜、成果、积分、对比、成长、学习路径、年度报告
智能助手：AI 工具箱、赛事陪练、AI 助手、执行匹配、知识库
系统管理：admin 专属审计日志、系统诊断
账户：通知、个人中心
```

## API And Authentication

Art Design Pro's default HTTP wrapper assumes a `{ code, msg, data }` response shape. SSGL currently returns direct business payloads such as `{ user }`, `{ competitions }`, and `{ tokens, user }`. The Vue frontend will therefore use an SSGL-specific API layer instead of forcing backend responses into the template wrapper contract.

Planned API modules:

```text
src/api/http.ts          # axios instance, token injection, refresh, global errors
src/api/auth.ts          # login, refresh, current user, logout helpers
src/api/ssgl.ts          # /api/v1 business endpoints
src/api/ai.ts            # /ai/api/v1 endpoints and streaming calls
```

Authentication behavior:

```text
localStorage.access_token
localStorage.refresh_token
Authorization: Bearer <access_token>
401 -> POST /api/v1/auth/refresh
refresh failure -> clear tokens -> return to login
403 -> Element Plus "权限不足" message
```

AI streaming endpoints continue to use `fetch` and `ReadableStream` handling, because browser axios is not appropriate for the existing SSE-style flows.

Development proxy configuration:

```text
/api -> http://localhost:8080
/ai  -> http://localhost:8000
```

The Vue project's environment files should expose equivalent values for `VITE_API_URL`, `VITE_API_PROXY_URL`, and `VITE_AI_PROXY_URL`.

## Page Migration Scope

The Vue version must cover all current React pages:

```text
dashboard
competitions
teams
calendar
approvals
preplans
registrations
awards
evaluations
stats
analytics
kanban
insights
leaderboard
showcase
achievement-gallery
points
compare
growth
learning-path
annual-report
aitools
coach
assistant
execution-match
knowledge-base
audit-logs
diagnostics
notifications
profile
feedback
```

Implementation patterns:

- List and management pages use Element Plus table, pagination, dialog, form, filters, and batch actions.
- Dashboards use Art Design Pro page containers and chart patterns, with role-specific admin, teacher, and student views.
- Analytics and stats pages use ECharts through the existing Art Design Pro chart integration.
- AI pages use Vue composables to manage streaming state, loading, cancellation, error states, and generated output.
- Notifications, global search, user menu, and profile integrate with the Art Design Pro header and Pinia state.
- Empty, loading, forbidden, and error states should use Element Plus and Art Design Pro visual conventions.

## Template Content Handling

Keep:

- Layout shell.
- Theme system.
- Header, sidebar, tabs, page container, global components.
- Exception pages.
- Result pages.
- Generic table, form, chart, upload, editor, and utility components that help rebuild SSGL pages.

Remove from user-facing navigation:

- Article demos.
- Template demo pages.
- Widget showcase menus.
- Generic example menus.
- Mock/demo routes that are unrelated to SSGL workflows.

These files may remain in the repository as references if they do not interfere with production navigation, routing, or build output.

## Verification Strategy

Minimum verification commands:

```bash
cd frontend-vue
pnpm install
pnpm build
pnpm dev --port 5174
```

The build should run the Vue TypeScript check used by Art Design Pro, followed by Vite production build.

Functional verification areas:

- Authentication: login, token persistence, token refresh, logout.
- Permissions: student, teacher, and admin menus and route restrictions.
- Core CRUD: competitions, teams, preplans, approvals, registrations, awards.
- Data views: dashboards, stats, analytics, kanban, leaderboard, showcase, points, compare, growth, learning path, annual report.
- AI flows: AI tools, coach, assistant, execution match, knowledge base, RAG upload/search.
- Account flows: notifications, profile, feedback.
- Admin flows: audit logs and diagnostics.
- Build and runtime proxy behavior against the existing Go backend and AI service.

## Rollout

During migration:

- `frontend-vite` remains the working React reference.
- `frontend-vue` is developed independently.
- Root project scripts and README continue to mention React until Vue verification passes.

After Vue verification passes:

- Update root README to describe Vue + Art Design Pro as the primary frontend.
- Update frontend build/start scripts to target `frontend-vue`.
- Keep `frontend-vite` for a short comparison period unless the user explicitly asks to remove it.

## Risks And Mitigations

- Full rewrite scope is large. Mitigation: migrate by route group and verify each module before moving on.
- Template HTTP assumptions conflict with SSGL response shapes. Mitigation: use a dedicated SSGL API client.
- Role naming differs between Art Design Pro and SSGL. Mitigation: remove template role names from business routes and use backend roles directly.
- AI streaming behavior differs from ordinary API calls. Mitigation: keep stream handling separate from axios.
- Demo routes may pollute navigation. Mitigation: explicitly curate business menu and keep examples out of production navigation.

## Acceptance Criteria

- `frontend-vue` exists and builds successfully.
- Vue login works with the current Go backend.
- Token refresh and logout behavior match the current React frontend.
- Student, teacher, and admin see role-appropriate menus.
- Every current React page has a Vue route and real Vue implementation.
- Main operations call current `/api/v1` and `/ai/api/v1` endpoints successfully.
- Art Design Pro demo pages are not visible in SSGL business navigation.
- Root documentation and scripts are ready to switch to `frontend-vue` after verification.
