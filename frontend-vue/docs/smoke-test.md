# SSGL Vue Frontend Smoke Test

## Prerequisites

1. Start the Go backend on port 8080
2. Start the AI service on port 8000
3. Start the Vue dev server: `cd frontend-vue && pnpm dev --port 5174`

## Test Accounts

| Role | Username | Password |
|------|----------|----------|
| Admin | liuzy | admin123 |
| Teacher | (from seeded data) | (from seeded data) |
| Student | (from seeded data) | (from seeded data) |

## Login and Menu Verification

1. Navigate to `http://localhost:5174`
2. Login with admin account (liuzy / admin123)
3. Verify redirect to `/dashboard`
4. Verify admin menu includes:
   - 概览 (Dashboard)
   - 赛事运营 (Competition Operations)
   - 流程审批 (Workflow)
   - 数据洞察 (Data Insights)
   - 智能助手 (AI Assistants)
   - 系统管理 (System Management) - includes 审计日志 and 系统诊断
   - 账户 (Account)
5. Logout and login with teacher account
6. Verify teacher menu excludes 审计日志 and 系统诊断
7. Logout and login with student account
8. Verify student menu excludes teacher/admin-only pages

## Route Coverage

Visit each business route and verify:
- Page renders without console errors
- Primary API request succeeds or shows user-facing empty/error state
- Tables do not overflow mobile width
- Dialogs open and close
- Forms validate required fields
- Role-restricted routes redirect or deny access

## AI Flows

1. **AI Tools** (`/aitools`): Select a tool, enter input, verify streaming output
2. **Assistant** (`/assistant`): Send a message, verify streaming response
3. **Coach** (`/coach`): Start a session, answer a question, verify feedback
4. **Execution Match** (`/execution-match`): Enter text, verify match scores
5. **Knowledge Base** (`/knowledge-base`): Upload document, search, verify results

## Smoke Test Results

| Date | Tester | Account | Result | Notes |
|------|--------|---------|--------|-------|
| | | | | |
