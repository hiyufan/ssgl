# 前端写操作交互补全 — 设计文档

- 日期：2026-06-10
- 范围：`frontend-vite/`（活跃的 React + Vite 前端）
- 状态：已与需求方确认，待转实现计划

## 1. 背景与问题

`frontend-vite/src/pages/` 下的页面布局已完整，且都会调用 `services/api.ts` 拉取真实数据。
真正缺失的是**写操作交互**：大量动作按钮是「死的」（没有 `onClick`），尽管对应的 API 方法
在 `services/api.ts` 中**早已存在**、后端路由也已就绪。

需求方将其称为「空壳」，并确认含义为：**页面能显示，但创建 / 编辑 / 详情 / 提交 / 结算等按钮点了没反应**。
目标是把这些按钮接到已有的 API 上。

### 现状盘点

| 页面 | 渲染数据 | 死按钮 / 缺失动作 |
|---|---|---|
| competitions | ✅ | 创建赛事 / 报名参加 / 编辑 / 详情 全部无 `onClick`；`create`/`update`/`publish`/`delete` 未被调用 |
| teams | ✅ | 创建团队 / 详情 / 编辑 无 `onClick`；`create`/`join`/`leave` 未被调用 |
| preplans | ✅ | 新建预计划 无 `onClick`；`create` 未被调用 |
| evaluations | ✅ | 提交评价 无 `onClick`；`create` 未被调用 |
| awards | ✅ | 完全没有结算按钮；`settle` 未被调用 |
| approvals | ✅ | **已完整接通**（approve/reject），作为参考实现 |
| aitools / knowledge-base / audit-logs / login / stats | ✅ | 已接通或本就只读，无需改动 |

## 2. 目标与非目标

### 目标
- 把上述 5 个页面（competitions、teams、preplans、evaluations、awards）的写操作按钮全部接通到已有 API。
- 引入一套与「forge」设计系统一致的、可复用的表单/弹窗基础组件，避免 5 份重复表单代码。
- 引入轻量 toast，替换当前静默的 `console.error`，向用户反馈成功/失败（含后端错误信息）。

### 非目标（本次不做）
- 任何后端改动。
- 团队 **加入（join）** 的发现入口：学生团队列表只显示自己的团队，页面内无可加入的他人团队，故不接 join。
- 团队 **编辑**：后端无 `PUT /teams/:id`，不支持，移除该按钮（记为后端缺口）。
- 分页。
- stats 排行榜上既有的 `TeacherStat` 字段错配（属历史问题）。
- 单元测试框架搭建（可选，见 §9）。

## 3. 架构

采用「**共享表单层 + 逐页接线**」方案：

```
components/ui/
  modal.tsx        (已存在，复用)
  form.tsx         (新增) FormModal + Field/TextInput/TextArea/Select/NumberInput/DateTimeInput/RatingInput
  toast.tsx        (新增) toast store + 视口组件
pages/
  competitions.tsx (改) 接线 + 引入 CompetitionForm / 详情弹窗
  teams.tsx        (改) 接线 + 引入 TeamForm / 团队详情弹窗
  preplans.tsx     (改) 接线 + 引入 PrePlanForm
  evaluations.tsx  (改) 接线 + 引入 EvaluationForm
  awards.tsx       (改) 新增结算按钮 + SettleAwardModal
services/api.ts    (改) awardsAPI.settle 补 { prize_amount } 请求体
main.tsx           (改) 挂载 <ToastViewport/>
```

分工约定：**通用表单原语**（FormModal、Field、各类 Input、RatingInput）住在 `components/ui/form.tsx`；
**按实体定制的表单**（CompetitionForm、TeamForm、PrePlanForm、EvaluationForm、SettleAwardModal）各自
**与其唯一使用方的页面文件同处一处**——即直接定义在对应 `pages/*.tsx` 内（每个仅被一个页面使用）。
若某页面文件因此显著变长，再在实现计划中拆为同目录子文件。

### 被否决的备选
- **逐页内联弹窗**：page 1 最快，但 5 份表单布局/校验重复、易视觉漂移。否决。
- **路由式 `/new`、`/:id/edit` 页**：改动 router、增加导航、破坏当前单视图体验，对这些表单过重。否决。

## 4. 共享组件规格

### 4.1 `components/ui/form.tsx`

所有组件沿用现有 CSS（`forge-input`、`card`、`btn`、CSS 变量），视觉与既有页面一致。

- **`FormModal`**：包裹现有 `Modal`，增加：
  - 底部「取消 / 提交」按钮区；提交按钮支持 `loading` 态（禁用 + Spinner）。
  - 顶部内联错误条（红色）用于显示提交失败原因。
  - props：`open`、`onClose`、`title`、`onSubmit`、`submitting`、`error`、`submitLabel`、`width`、`children`。
- **`Field`**：`label` + 必填星标 + `children` + 可选 `hint`。
- **`TextInput` / `TextArea` / `NumberInput`**：受控，套 `forge-input` 样式。
- **`Select`**：受控下拉，`options: {value, label}[]` + `placeholder`。
- **`DateTimeInput`**：`<input type="datetime-local">`；值与 RFC3339 互转
  （展示用本地值；提交前 `new Date(value).toISOString()`）。
- **`RatingInput`**：1–5 星可点选，复用 `page-helpers` 的 `Stars` 视觉，`value/onChange`。

### 4.2 `components/ui/toast.tsx`

- zustand store：`toasts: {id, type:'success'|'error', message}[]`，`push(type, message)`、`dismiss(id)`。
- `ToastViewport`：右下角堆叠，3.5s 自动消失，复用 forge 配色（`--green` / `--red`）。
- 导出便捷函数 `toast.success(msg)` / `toast.error(msg)`。
- API 错误提取助手：从 axios 错误中取 `response.data.error`，回退到通用文案。

## 5. 逐页交互规格

> 当前用户：`useAuthStore(s => s.user)`（含 `id`、`role`、`name`）。角色：`useRole()`。
> 所有列表在成功后乐观更新或重新拉取；所有失败走 `toast.error(后端 error)`。

### 5.1 competitions.tsx

- **创建赛事 / 编辑**：门槛改为 **teacher + admin**（修正当前仅 admin 的错误门槛；后端 `staff` 组允许 teacher+admin，编辑按所有者校验）。打开 `CompetitionForm`：
  - 字段：`title`(必填)、`type`(select: hackathon/innovation/research, 必填)、`description`、
    `max_team_size`(必填, ≥1)、`min_team_size`(必填, ≥1)、`registration_deadline`(datetime)、
    `start_date`(datetime, 必填)、`end_date`(datetime, 必填)、`location`、`prize`、`tags`。
  - 创建：`competitionsAPI.create(payload)`（日期转 RFC3339），新建为 `draft`。成功 → 列表前插 + toast。
  - 编辑：预填，`competitionsAPI.update(id, payload)`；成功 → 替换列表项。
  - **删除（确认）**：编辑弹窗内「危险区」按钮，`confirm()` 后 `competitionsAPI.delete(id)`，仅所有者/admin（后端兜底）。
- **发布**：`draft` 状态的卡片（teacher/admin）显示「发布」→ `competitionsAPI.publish(id)`；成功 → 状态变 `published`。
- **报名参加**（student，`published` 赛事）：打开 **创建团队** 弹窗（`TeamForm`），赛事预选为当前卡片
  （后端无单独报名接口，报名 = 为该赛事创建团队）。
- **详情**：只读弹窗，`competitionsAPI.get(id)` → 展示完整描述、日期、`teams_count`、organizer。

### 5.2 teams.tsx

- **创建团队**（student）：`TeamForm`：
  - 字段：`name`(必填)、`competition_id`(select：状态非 cancelled 的赛事)。
  - `teamsAPI.create({ name, competition_id })`。后端拦截「同一赛事重复建队」→ toast 显示其 error。
  - 成功 → 列表前插 + toast。
- **详情**：弹窗展示成员、队长、关联赛事；若当前用户是**非队长成员** → 显示「退出团队」→
  `teamsAPI.leave(id)`，成功后刷新列表并关闭。
- **编辑**：移除该按钮（后端不支持）。

### 5.3 preplans.tsx

- **新建预计划**（student）：`PrePlanForm`：
  - 字段：`team_id`(select：`teamsAPI.list()` 返回的「我的团队」)、`title`(必填)、`tech_stack`、
    `target_audience`、`market_analysis`、`innovation`、`expected_outcome`、`timeline`。
  - `competition_id` 由所选团队的 `competition_id` 推导（不单独让用户选）。
  - `prePlansAPI.create(payload)`，后端置为 `submitted`。成功 → 重新拉取列表并选中新项 + toast。

### 5.4 evaluations.tsx

- **提交评价**（student）：`EvaluationForm`：
  - 字段：`teacher_id`(select：`statsAPI.teachers()`，用其 `id`+`name`)、`competition_id`(select：
    `competitionsAPI.list()`)、`teaching`/`communication`/`availability`/`overall`(各 RatingInput 1–5, 必填)、
    `feedback`(可选)。
  - `evaluationsAPI.create(payload)`。后端拦截「同赛事同教师重复评价」→ toast。
  - 成功 → 列表前插 + toast。
  - 注：teacher 选项依赖 `stats/teachers`（任意已登录用户可访问，返回 `{id, name}`，足够作为选择器数据源）。

### 5.5 awards.tsx

- 表格末尾新增一列「操作」：对 `status !== 'settled'` 的奖项，**admin** 显示「结算」按钮（其它角色/已结算
  显示占位 `—`）→ `SettleAwardModal`：可编辑 `prize_amount`（预填当前 `award.prize_amount`），确认后
  `awardsAPI.settle(id, prizeAmount)`。成功 → 行状态更新为 `settled` + toast。

## 6. `services/api.ts` 改动

- `awardsAPI.settle(id: number, prizeAmount?: number)`：改为
  `api.post(`/awards/${id}/settle`, { prize_amount: prizeAmount ?? 0 })`。
  （后端 `Settle` 用 `ShouldBindJSON` 解析 `SettleAwardRequest{ prize_amount }`，空 body 会报错，必须发送 JSON 体。）
- 其余方法（competitions create/update/delete/publish、teams create/join/leave、preplans create、
  evaluations create）签名已满足需求，无需改动。

## 7. 错误处理与反馈

- 每个 mutation：`try` 调 API → 成功 `toast.success` + 更新本地状态 + 关弹窗；
  `catch` → 弹窗内联错误条 + `toast.error`，提取 `err.response.data.error`。
- 表单提交期间禁用提交按钮、显示 Spinner。
- 破坏性操作（删除赛事、退出团队）用 `confirm()` 二次确认（与 knowledge-base 删除一致）。

## 8. 角色门槛汇总

| 动作 | 可见角色 | 后端兜底 |
|---|---|---|
| 创建/编辑/删除/发布 赛事 | teacher + admin | `staff` 组 + 所有者校验（`canManageCompetition`）|
| 报名参加（建队登记）| student | 任意已登录可建队 |
| 创建团队 / 退出团队 | student | 任意已登录；重复建队/队长退出被拦截 |
| 新建预计划 | student | 任意已登录 |
| 提交评价 | student | 任意已登录；重复评价被拦截 |
| 结算奖项 | admin | `admin` 组 |

## 9. 测试

- 必做：`tsc --noEmit`（类型）+ `eslint`（lint），两者均已配置；对每个创建流程做一次手动冒烟（连本地后端）。
- 可选（如需方要求）：引入 Vitest + React Testing Library，对表单校验与 `DateTimeInput` 的 RFC3339 转换写少量单测。

## 10. 已确认的决策

1. 赛事创建/编辑对 **teacher 与 admin** 同时开放（修正现状的仅 admin），后端按所有者兜底。
2. 移除团队「编辑」按钮（后端无更新接口）。
3. 赛事「删除」作为编辑弹窗内的危险操作纳入本次实现。

## 11. 受影响文件清单

新增：
- `frontend-vite/src/components/ui/form.tsx`
- `frontend-vite/src/components/ui/toast.tsx`

修改：
- `frontend-vite/src/services/api.ts`（settle 补 body）
- `frontend-vite/src/main.tsx`（挂载 ToastViewport）
- `frontend-vite/src/pages/competitions.tsx`
- `frontend-vite/src/pages/teams.tsx`
- `frontend-vite/src/pages/preplans.tsx`
- `frontend-vite/src/pages/evaluations.tsx`
- `frontend-vite/src/pages/awards.tsx`
