# 前端写操作交互补全 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 competitions / teams / preplans / evaluations / awards 五个页面里「死的」动作按钮接到已有后端 API，并补一套共享的表单弹窗与 toast 反馈。

**Architecture:** 新增两个共享 UI 模块（`components/ui/form.tsx` 表单原语、`components/ui/toast.tsx` 反馈）与一个纯函数工具（`lib/form-utils.ts`）；每个实体定制表单内联在其唯一使用方的页面文件里；所有 mutation 调用 `services/api.ts` 中已存在的方法，成功/失败用 toast 反馈。

**Tech Stack:** React 19 + TypeScript + Vite，Zustand 状态，axios，现有「forge」CSS（`index.css` 的 `.forge-input` / `.btn-*` / `.card` / CSS 变量）。无组件库；沿用内联 style + 既有 CSS 类。

**参考实现：** `frontend-vite/src/pages/approvals.tsx` 已经接通 approve/reject，可作为「调用 API + 更新本地状态」的范式。

**规范：** 见 `docs/superpowers/specs/2026-06-10-frontend-write-interactions-design.md`。

**验证命令（每个任务结束执行）：**
- **硬门槛 —— 类型 + 编译**：在 `frontend-vite/` 下 `npm run build`（即 `tsc -b && vite build`）。基线已通过，必须保持零错误、不得引入新类型错误。
- **Lint（基线已脏）**：在 `frontend-vite/` 下 `npm run lint`。⚠️ 项目基线**已有 13 个 error + 2 warning**（多为既有打字机效果里的 `react-hooks/set-state-in-effect`，分布在 assistant/charts/topbar/dashboard-layout/audit-logs/competitions/knowledge-base/preplans 等）。目标是**你改动的文件不新增 lint 错误**，**不要**去修这些与本任务无关的历史报错（属范围外）。
- 手动冒烟：见各任务的「Manual smoke」清单（需先跑后端 + `npm run dev`）

> **🔧 全局约定（所有任务遵守，优先于下方代码片段中的写法）：弹窗表单状态用「挂载即重置」，不要在 `useEffect` 里同步 `setState`。**
> 否则会触发上面的 `react-hooks/set-state-in-effect`，给你改的文件新增 lint 错误。具体做法：
> 1. **页面侧挂载门控**渲染弹窗：用 `{open && <XForm onClose=... />}`，关闭即卸载、再次打开即全新挂载。
> 2. 表单组件**不接收 `open` prop**（挂载即代表打开），内部用 `useState(() => 从 props 初始化)` 取初值，**不写重置用的 `useEffect`**。向 `FormModal` 传 `open={true}` 字面量。
> 3. **挂载时拉取数据**仍放 `useEffect(() => { api().then(setState) }, [])`——`.then` 回调里的 setState 是异步的，规则**不**报错（既有页面的 `.then(setState)` 即如此）。
> 下方各表单片段已按此约定写好；若你看到任何「重置用 useEffect + open prop」请以本约定为准。

> 提交信息统一以中文动词开头，并附：
> `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
> 全程在分支 `feat/frontend-write-interactions` 上（Task 0 创建）。

> **⚠️ 任务执行顺序：先 Task 6（teams）再 Task 5（competitions）。** Task 5 的「报名参加」复用 Task 6 导出的 `TeamForm`，若先做 Task 5 会因 `TeamForm` 尚未 `export` 而类型检查失败。其余任务（1→4、7→11）按编号顺序即可。

---

## File Structure

新增：
- `frontend-vite/src/lib/form-utils.ts` — 纯函数：日期 RFC3339 ↔ datetime-local、axios 错误提取。
- `frontend-vite/src/components/ui/toast.tsx` — toast store + `ToastViewport` + `toast.success/error`。
- `frontend-vite/src/components/ui/form.tsx` — `FormModal` 及表单原语 `Field/TextInput/TextArea/NumberInput/Select/DateTimeInput/RatingInput`。

修改：
- `frontend-vite/src/main.tsx` — 挂载 `<ToastViewport/>`。
- `frontend-vite/src/services/api.ts` — `awardsAPI.settle` 补 `{ prize_amount }` 请求体。
- `frontend-vite/src/pages/competitions.tsx` — 创建/编辑/删除/发布/详情/报名 接线 + `CompetitionForm`、`CompetitionDetail`。
- `frontend-vite/src/pages/teams.tsx` — 创建/详情/退出 接线 + `TeamForm`、`TeamDetail`，移除编辑按钮。
- `frontend-vite/src/pages/preplans.tsx` — 新建 接线 + `PrePlanForm`。
- `frontend-vite/src/pages/evaluations.tsx` — 提交评价 接线 + `EvaluationForm`。
- `frontend-vite/src/pages/awards.tsx` — 新增「操作」列 + `SettleAwardModal`。

---

## Task 0: 建分支

- [ ] **Step 1: 创建并切换分支**

Run:
```bash
git checkout -b feat/frontend-write-interactions
```
Expected: `Switched to a new branch 'feat/frontend-write-interactions'`

> 说明：工作树里已有的无关改动（`.claude/settings.local.json`、`docs/flowcharts/flowcharts.md`）不要纳入本次任何提交，每步 `git add` 只加该步明确列出的文件。

---

## Task 1: 纯函数工具 `lib/form-utils.ts`

**Files:**
- Create: `frontend-vite/src/lib/form-utils.ts`

- [ ] **Step 1: 写文件**

```typescript
import axios from 'axios';

/**
 * 把 <input type="datetime-local"> 的本地值（"YYYY-MM-DDTHH:mm"）转成后端要的 RFC3339。
 * 空串返回空串（表示「未填」）。
 */
export function localInputToISO(local: string): string {
  if (!local) return '';
  const d = new Date(local);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString();
}

/**
 * 把后端的 RFC3339/ISO 字符串转成 datetime-local 控件能显示的本地值 "YYYY-MM-DDTHH:mm"。
 * 空/非法返回空串。
 */
export function isoToLocalInput(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * 从未知错误里提取后端返回的 { error } 文案；取不到则回退到 fallback。
 */
export function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { error?: string; message?: string } | undefined;
    return data?.error || data?.message || fallback;
  }
  return fallback;
}
```

- [ ] **Step 2: 类型检查 + lint**

Run: `npm run build` then `npm run lint` (in `frontend-vite/`)
Expected: 均通过（新文件无错误；尚无引用者）。

- [ ] **Step 3: Commit**

```bash
git add frontend-vite/src/lib/form-utils.ts
git commit -m "feat(frontend): 新增表单工具函数(日期RFC3339转换/API错误提取)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Toast `components/ui/toast.tsx` + 挂载

**Files:**
- Create: `frontend-vite/src/components/ui/toast.tsx`
- Modify: `frontend-vite/src/main.tsx`

- [ ] **Step 1: 写 toast.tsx**

```tsx
import { create } from 'zustand';
import { useEffect } from 'react';

type ToastType = 'success' | 'error';
interface ToastItem { id: number; type: ToastType; message: string; }

interface ToastState {
  toasts: ToastItem[];
  push: (type: ToastType, message: string) => void;
  dismiss: (id: number) => void;
}

let seq = 0;
const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (type, message) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), 3500);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

/** 便捷调用：toast.success(msg) / toast.error(msg) —— 可在事件回调里直接用，无需 hook。 */
export const toast = {
  success: (message: string) => useToastStore.getState().push('success', message),
  error: (message: string) => useToastStore.getState().push('error', message),
};

/** 右下角 toast 视口，在 main.tsx 挂载一次。 */
export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360 }}>
      {toasts.map((t) => (
        <Toast key={t.id} item={t} onDone={() => dismiss(t.id)} />
      ))}
    </div>
  );
}

function Toast({ item, onDone }: { item: ToastItem; onDone: () => void }) {
  useEffect(() => {
    // 进入即开始计时由 store 控制；此处仅保证组件存在。
  }, []);
  const isErr = item.type === 'error';
  const accent = isErr ? 'var(--red)' : 'var(--green)';
  const bg = isErr ? 'var(--red-bg)' : 'var(--green-bg)';
  return (
    <div
      className="card anim-scale"
      onClick={onDone}
      style={{
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
        borderLeft: `3px solid ${accent}`, background: bg, cursor: 'pointer',
        boxShadow: 'var(--shadow)',
      }}
    >
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: accent, flexShrink: 0 }} />
      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, lineHeight: 1.5 }}>{item.message}</span>
    </div>
  );
}
```

> 注：`--red-bg` / `--green-bg` / `--shadow` 均为 `index.css` 既有变量（pages 中已使用）。

- [ ] **Step 2: 在 main.tsx 挂载 ToastViewport**

把 `frontend-vite/src/main.tsx` 改为：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { ToastViewport } from './components/ui/toast'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
      <ToastViewport />
    </BrowserRouter>
  </StrictMode>,
)
```

- [ ] **Step 3: 类型检查 + lint**

Run: `npm run build` then `npm run lint`
Expected: `npm run build` 零错误（硬门槛）。`npm run lint` 总错误数不超过基线 13（即你改的文件未新增报错）。

- [ ] **Step 4: Commit**

```bash
git add frontend-vite/src/components/ui/toast.tsx frontend-vite/src/main.tsx
git commit -m "feat(frontend): 新增轻量 toast 反馈组件并全局挂载

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: 表单原语 `components/ui/form.tsx`

**Files:**
- Create: `frontend-vite/src/components/ui/form.tsx`

- [ ] **Step 1: 写 form.tsx**

```tsx
import type { ReactNode } from 'react';
import { Modal } from './modal';
import { Button } from './button';
import { Icon } from './icon';
import { isoToLocalInput, localInputToISO } from '@/lib/form-utils';

/** 带提交/取消页脚、提交态与错误条的弹窗表单容器。 */
export function FormModal({
  open, onClose, title, onSubmit, submitting, error, submitLabel = '保存', width = 560, children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  onSubmit: () => void;
  submitting?: boolean;
  error?: string | null;
  submitLabel?: string;
  width?: number;
  children: ReactNode;
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} width={width}>
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
      >
        {error && (
          <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--red-bg)', border: '1px solid var(--red)', color: 'var(--red)', fontSize: 12, lineHeight: 1.5 }}>
            {error}
          </div>
        )}
        {children}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <Button type="button" variant="ghost" onClick={onClose} disabled={submitting}>取消</Button>
          <Button type="submit" variant="primary" loading={submitting}>{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  );
}

/** label + 必填星标 + 控件。 */
export function Field({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: ReactNode;
}) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)' }}>
        {label}{required && <span style={{ color: 'var(--red)', marginLeft: 4 }}>*</span>}
      </span>
      {children}
      {hint && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{hint}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className="forge-input" {...props} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="forge-input" style={{ resize: 'vertical', minHeight: 72, ...props.style }} {...props} />;
}

export function NumberInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input type="number" className="forge-input" {...props} />;
}

export interface SelectOption { value: string; label: string; }
export function Select({ value, onChange, options, placeholder, disabled }: {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <select className="forge-input" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

/** datetime-local 控件，value/onChange 走 RFC3339(ISO) 字符串。 */
export function DateTimeInput({ value, onChange }: { value: string; onChange: (iso: string) => void }) {
  return (
    <input
      type="datetime-local"
      className="forge-input"
      value={isoToLocalInput(value)}
      onChange={(e) => onChange(localInputToISO(e.target.value))}
    />
  );
}

/** 1–5 星可点选评分。 */
export function RatingInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(i + 1)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
            aria-label={`${i + 1} 星`}
          >
            <span style={{ color: filled ? 'var(--amber)' : 'var(--border-2)' }}>
              <Icon name="star" size={20} />
            </span>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: 类型检查 + lint**

Run: `npm run build` then `npm run lint`
Expected: 通过（`Icon` 含 `star`；`Button` 含 `type`/`variant`/`loading`，均已存在）。

- [ ] **Step 3: Commit**

```bash
git add frontend-vite/src/components/ui/form.tsx
git commit -m "feat(frontend): 新增共享表单原语(FormModal/Field/Select/DateTimeInput/RatingInput)

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: 修 `awardsAPI.settle` 请求体

**Files:**
- Modify: `frontend-vite/src/services/api.ts:220-223`

后端 `Settle` 用 `ShouldBindJSON` 解析 `{ prize_amount }`，空 body 会 400。

- [ ] **Step 1: 替换 settle 方法**

把现有：
```typescript
  settle: async (id: number): Promise<{ award: Award }> => {
    const response = await api.post<{ award: Award }>(`/awards/${id}/settle`);
    return response.data;
  },
```
改为：
```typescript
  settle: async (id: number, prizeAmount?: number): Promise<{ award: Award }> => {
    const response = await api.post<{ award: Award }>(`/awards/${id}/settle`, {
      prize_amount: prizeAmount ?? 0,
    });
    return response.data;
  },
```

- [ ] **Step 2: 类型检查 + lint**

Run: `npm run build` then `npm run lint`
Expected: `npm run build` 零错误（硬门槛）。`npm run lint` 总错误数不超过基线 13（即你改的文件未新增报错）。

- [ ] **Step 3: Commit**

```bash
git add frontend-vite/src/services/api.ts
git commit -m "fix(frontend): awardsAPI.settle 补发 prize_amount 请求体

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: competitions 页接线

**Files:**
- Modify: `frontend-vite/src/pages/competitions.tsx`

目标：创建/编辑（teacher+admin）、删除（编辑弹窗内危险区）、发布（draft 卡片）、详情（只读弹窗）、报名参加（student → 打开建队弹窗，赛事预选）。

> 建队弹窗复用 Task 6 里 teams.tsx 导出的 `TeamForm`。因此本任务依赖 Task 6 先导出 `TeamForm`。
> **执行顺序：先做 Task 6 的 Step 1（抽出并导出 `TeamForm`），再回到本任务。** 若按编号顺序执行，请在本任务 Step 3 引入 `TeamForm` 时确认其已 `export`。

- [ ] **Step 1: 追加 imports**

在 `competitions.tsx` 顶部 import 区追加这 6 行（`useState`/`useEffect`、`competitionsAPI`、`Competition`、`StatusBadge`/`TypeBadge`、`Icon`、`PageHeader`、`EmptyState`、`useRole` 文件已 import，不要重复）：
```typescript
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { FormModal, Field, TextInput, TextArea, NumberInput, Select, DateTimeInput } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import { TeamForm } from '@/pages/teams';
```

- [ ] **Step 2: 在文件内新增 `CompetitionForm` 组件**

在 `CompetitionsPage` 函数**之前**插入：

```tsx
const TYPE_OPTIONS = [
  { value: 'hackathon', label: 'Hackathon' },
  { value: 'innovation', label: '创新赛' },
  { value: 'research', label: '研究赛' },
];

type CompFormState = {
  title: string; type: string; description: string;
  max_team_size: string; min_team_size: string;
  registration_deadline: string; start_date: string; end_date: string;
  location: string; prize: string; tags: string;
};

function emptyCompForm(): CompFormState {
  return { title: '', type: 'hackathon', description: '', max_team_size: '4', min_team_size: '1', registration_deadline: '', start_date: '', end_date: '', location: '', prize: '', tags: '' };
}

function CompetitionForm({ onClose, initial, onSaved, onDeleted }: {
  onClose: () => void;
  initial: Competition | null;
  onSaved: (comp: Competition, isNew: boolean) => void;
  onDeleted: (id: number) => void;
}) {
  const isEdit = !!initial;
  const [form, setForm] = useState<CompFormState>(() => initial ? {
    title: initial.title, type: initial.type, description: initial.description || '',
    max_team_size: String(initial.max_team_size || 4), min_team_size: String(initial.min_team_size || 1),
    registration_deadline: initial.registration_deadline || '', start_date: initial.start_date || '', end_date: initial.end_date || '',
    location: initial.location || '', prize: initial.prize || '', tags: initial.tags || '',
  } : emptyCompForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof CompFormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { setError('请填写赛事名称'); return; }
    if (!form.start_date || !form.end_date) { setError('请填写开始与结束时间'); return; }
    setSubmitting(true); setError(null);
    const payload = {
      title: form.title.trim(),
      type: form.type as Competition['type'],
      description: form.description,
      max_team_size: Number(form.max_team_size) || 1,
      min_team_size: Number(form.min_team_size) || 1,
      registration_deadline: form.registration_deadline,
      start_date: form.start_date,
      end_date: form.end_date,
      location: form.location,
      prize: form.prize,
      tags: form.tags,
    };
    try {
      const res = isEdit
        ? await competitionsAPI.update(initial!.id, payload)
        : await competitionsAPI.create(payload);
      toast.success(isEdit ? '赛事已更新' : '赛事已创建（草稿）');
      onSaved(res.competition, !isEdit);
      onClose();
    } catch (err) {
      setError(getApiError(err, isEdit ? '更新失败' : '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title={isEdit ? '编辑赛事' : '创建赛事'} onSubmit={submit} submitting={submitting} error={error} submitLabel={isEdit ? '保存' : '创建'} width={620}>
      <Field label="赛事名称" required><TextInput value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="例如：2026 校园创新马拉松" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="类型" required><Select value={form.type} onChange={set('type')} options={TYPE_OPTIONS} /></Field>
        <Field label="最小队伍人数" required><NumberInput min={1} value={form.min_team_size} onChange={(e) => set('min_team_size')(e.target.value)} /></Field>
        <Field label="最大队伍人数" required><NumberInput min={1} value={form.max_team_size} onChange={(e) => set('max_team_size')(e.target.value)} /></Field>
      </div>
      <Field label="赛事简介"><TextArea value={form.description} onChange={(e) => set('description')(e.target.value)} placeholder="一句话介绍赛事主题与目标" /></Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="报名截止"><DateTimeInput value={form.registration_deadline} onChange={set('registration_deadline')} /></Field>
        <Field label="开始时间" required><DateTimeInput value={form.start_date} onChange={set('start_date')} /></Field>
        <Field label="结束时间" required><DateTimeInput value={form.end_date} onChange={set('end_date')} /></Field>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="地点"><TextInput value={form.location} onChange={(e) => set('location')(e.target.value)} placeholder="线上 / 教学楼…" /></Field>
        <Field label="奖金"><TextInput value={form.prize} onChange={(e) => set('prize')(e.target.value)} placeholder="如 ¥50,000" /></Field>
        <Field label="标签"><TextInput value={form.tags} onChange={(e) => set('tags')(e.target.value)} placeholder="逗号分隔" /></Field>
      </div>
      {isEdit && (
        <div style={{ marginTop: 4, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <Button type="button" variant="danger" size="sm" onClick={async () => {
            if (!confirm(`确认删除赛事「${initial!.title}」？此操作不可撤销。`)) return;
            try {
              await competitionsAPI.delete(initial!.id);
              toast.success('赛事已删除');
              onDeleted(initial!.id);
              onClose();
            } catch (err) {
              toast.error(getApiError(err, '删除失败'));
            }
          }}>删除赛事</Button>
        </div>
      )}
    </FormModal>
  );
}
```

- [ ] **Step 3: 在 `CompetitionsPage` 内新增状态与处理器**

在 `CompetitionsPage` 组件体内、`useEffect` 之后加入：

```tsx
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Competition | null>(null);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [detail, setDetail] = useState<Competition | null>(null);
  const [registerComp, setRegisterComp] = useState<Competition | null>(null);
  const canManage = role === 'teacher' || role === 'admin';

  const handleSaved = (comp: Competition, isNew: boolean) =>
    setCompetitions((prev) => (isNew ? [comp, ...prev] : prev.map((c) => (c.id === comp.id ? comp : c))));
  const handleDeleted = (id: number) =>
    setCompetitions((prev) => prev.filter((c) => c.id !== id));

  const openCreate = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (comp: Competition) => { setEditing(comp); setFormOpen(true); };

  const openDetail = async (comp: Competition) => {
    setDetailId(comp.id); setDetail(comp);
    try {
      const res = await competitionsAPI.get(comp.id);
      setDetail(res.competition);
    } catch { /* 保底用列表项数据 */ }
  };

  const publish = async (comp: Competition) => {
    try {
      const res = await competitionsAPI.publish(comp.id);
      toast.success('赛事已发布');
      handleSaved(res.competition, false);
    } catch (err) {
      toast.error(getApiError(err, '发布失败'));
    }
  };
```

- [ ] **Step 4: 接线按钮（替换 JSX）**

4a. 页头创建按钮 —— 把 `PageHeader` 的 `actions` 由：
```tsx
        actions={role === 'admin' ? <button className="btn btn-primary"><Icon name="plus" size={13}/>创建赛事</button> : undefined}
```
改为：
```tsx
        actions={canManage ? <Button variant="primary" icon={<Icon name="plus" size={13}/>} onClick={openCreate}>创建赛事</Button> : undefined}
```

4b. 卡片底部按钮区 —— 把：
```tsx
                  <div style={{ display: 'flex', gap: 8 }}>
                    {role === 'student' && comp.status === 'published' && (
                      <button className="btn btn-primary btn-sm">报名参加</button>
                    )}
                    {role === 'admin' && <button className="btn btn-outline btn-sm"><Icon name="edit" size={12}/></button>}
                    <button className="btn btn-ghost btn-sm">详情 <Icon name="right" size={12}/></button>
                  </div>
```
改为：
```tsx
                  <div style={{ display: 'flex', gap: 8 }}>
                    {role === 'student' && comp.status === 'published' && (
                      <Button variant="primary" size="sm" onClick={() => setRegisterComp(comp)}>报名参加</Button>
                    )}
                    {canManage && comp.status === 'draft' && (
                      <Button variant="teal" size="sm" onClick={() => publish(comp)}>发布</Button>
                    )}
                    {canManage && (
                      <Button variant="outline" size="sm" icon={<Icon name="edit" size={12}/>} onClick={() => openEdit(comp)} />
                    )}
                    <Button variant="ghost" size="sm" iconRight={<Icon name="right" size={12}/>} onClick={() => openDetail(comp)}>详情</Button>
                  </div>
```

- [ ] **Step 5: 渲染弹窗**

在 `CompetitionsPage` 的最外层 `<div className="forge-page">` 闭合标签**之前**（return 内末尾）加入：

```tsx
      {formOpen && (
        <CompetitionForm onClose={() => setFormOpen(false)} initial={editing} onSaved={handleSaved} onDeleted={handleDeleted} />
      )}

      {registerComp && (
        <TeamForm
          onClose={() => setRegisterComp(null)}
          competitions={[registerComp]}
          fixedCompetition={registerComp}
          onCreated={() => { setRegisterComp(null); toast.success('报名成功，已创建团队'); }}
        />
      )}

      <CompetitionDetail comp={detailId ? detail : null} onClose={() => { setDetailId(null); setDetail(null); }} />
```

并在文件内（`CompetitionsPage` 之后）新增只读详情组件：

```tsx
function CompetitionDetail({ comp, onClose }: { comp: Competition | null; onClose: () => void }) {
  if (!comp) return null;
  const fmt = (s?: string) => (s ? new Date(s).toLocaleString('zh-CN') : '—');
  return (
    <Modal open={!!comp} onClose={onClose} title={comp.title} width={620}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <StatusBadge status={comp.status} />
          <TypeBadge type={comp.type} />
        </div>
        {comp.description && <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>{comp.description}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { k: '报名截止', v: fmt(comp.registration_deadline) },
            { k: '开始时间', v: fmt(comp.start_date) },
            { k: '结束时间', v: fmt(comp.end_date) },
            { k: '地点', v: comp.location || '线上' },
            { k: '奖金', v: comp.prize || '—' },
            { k: '已报名队伍', v: String(comp.teams_count ?? 0) },
          ].map(({ k, v }) => (
            <div key={k} style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--surface-2)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3 }}>{k}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}
```

并把顶部 import 补上 `Modal`：
```typescript
import { Modal } from '@/components/ui/modal';
```
（`StatusBadge`、`TypeBadge` 该文件已 import。）

- [ ] **Step 6: 类型检查 + lint**

Run: `npm run build` then `npm run lint`
Expected: `npm run build` 零错误（硬门槛）。`npm run lint` 总错误数不超过基线 13（即你改的文件未新增报错）。常见报错：`TeamForm` 未导出 → 确认 Task 6 Step 1 已 `export function TeamForm`。

- [ ] **Step 7: Manual smoke**

启动后端 + `npm run dev`，分别登录：
- teacher/admin：点「创建赛事」→ 填名称/类型/开始结束时间 → 创建 → 列表出现新草稿 + 成功 toast；草稿卡点「发布」→ 状态变报名中；点编辑铅笔 → 改名保存 → 卡片更新；编辑弹窗内「删除赛事」→ 确认 → 列表移除。
- student：对一个「报名中(published)」赛事点「报名参加」→ 建队弹窗（赛事已锁定）→ 填队名创建 → 成功 toast。
- 任意角色：点「详情」→ 弹窗显示完整信息。

- [ ] **Step 8: Commit**

```bash
git add frontend-vite/src/pages/competitions.tsx
git commit -m "feat(frontend): competitions 页接通创建/编辑/删除/发布/详情/报名交互

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: teams 页接线

**Files:**
- Modify: `frontend-vite/src/pages/teams.tsx`

目标：创建团队（student）、详情弹窗（成员/赛事 + 非队长成员可退出）、移除编辑按钮、导出可复用的 `TeamForm`（供 competitions「报名参加」复用）。

- [ ] **Step 1: 追加 imports + 导出 `TeamForm`**

顶部 import 追加：
```typescript
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { FormModal, Field, TextInput, Select } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
```

在 `TeamsPage` 之前新增**可导出**的 `TeamForm`：

```tsx
/** 建队表单。competitions 页「报名参加」会以 fixedCompetition 复用本组件。 */
export function TeamForm({ onClose, competitions, fixedCompetition, onCreated }: {
  onClose: () => void;
  competitions: Competition[];
  fixedCompetition?: Competition | null;
  onCreated: (team: Team) => void;
}) {
  const [name, setName] = useState('');
  const [compId, setCompId] = useState<string>(() => fixedCompetition ? String(fixedCompetition.id) : '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const options = (fixedCompetition ? [fixedCompetition] : competitions.filter((c) => c.status !== 'cancelled'))
    .map((c) => ({ value: String(c.id), label: c.title }));

  const submit = async () => {
    if (!name.trim()) { setError('请填写团队名称'); return; }
    if (!compId) { setError('请选择参赛赛事'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await teamsAPI.create({ name: name.trim(), competition_id: Number(compId) });
      toast.success('团队已创建');
      onCreated(res.team);
      onClose();
    } catch (err) {
      setError(getApiError(err, '创建失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title={fixedCompetition ? `报名：${fixedCompetition.title}` : '创建团队'} onSubmit={submit} submitting={submitting} error={error} submitLabel="创建">
      <Field label="团队名称" required><TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="给你的队伍起个名字" /></Field>
      <Field label="参赛赛事" required>
        <Select value={compId} onChange={setCompId} options={options} placeholder="选择赛事" disabled={!!fixedCompetition} />
      </Field>
    </FormModal>
  );
}
```

- [ ] **Step 2: `TeamsPage` 新增状态与处理器**

在 `TeamsPage` 组件体内 `useEffect` 之后加入：
```tsx
  const currentUser = useAuthStore((s) => s.user);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);

  const onCreated = (team: Team) => setTeams((prev) => [team, ...prev]);
  const onLeft = (teamId: number) => {
    setTeams((prev) => prev.filter((t) => t.id !== teamId));
    setDetailTeam(null);
  };
```

- [ ] **Step 3: 接线创建按钮 + 卡片按钮**

3a. 页头：把
```tsx
        actions={role === 'student' ? <button className="btn btn-primary"><Icon name="plus" size={13}/>创建团队</button> : undefined}
```
改为：
```tsx
        actions={role === 'student' ? <Button variant="primary" icon={<Icon name="plus" size={13}/>} onClick={() => setCreateOpen(true)}>创建团队</Button> : undefined}
```

3b. 卡片底部：把
```tsx
                  <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <button className="btn btn-outline btn-sm" style={{ flex: 1 }}><Icon name="users" size={12}/> 详情</button>
                    {role !== 'student' && <button className="btn btn-ghost btn-sm"><Icon name="edit" size={12}/></button>}
                  </div>
```
改为（移除编辑按钮）：
```tsx
                  <div style={{ display: 'flex', gap: 8, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                    <Button variant="outline" size="sm" full icon={<Icon name="users" size={12}/>} onClick={() => setDetailTeam(team)}>详情</Button>
                  </div>
```

- [ ] **Step 4: 渲染弹窗 + 详情组件**

在 `TeamsPage` return 最外层闭合前加入：
```tsx
      {createOpen && <TeamForm onClose={() => setCreateOpen(false)} competitions={competitions} onCreated={onCreated} />}
      <TeamDetail team={detailTeam} currentUserId={currentUser?.id} onClose={() => setDetailTeam(null)} onLeft={onLeft} />
```

文件内新增：
```tsx
function TeamDetail({ team, currentUserId, onClose, onLeft }: {
  team: Team | null;
  currentUserId?: number;
  onClose: () => void;
  onLeft: (teamId: number) => void;
}) {
  const [leaving, setLeaving] = useState(false);
  if (!team) return null;
  const myMembership = team.members?.find((m) => m.user_id === currentUserId);
  const canLeave = !!myMembership && myMembership.role !== 'leader';

  const leave = async () => {
    if (!confirm(`确认退出团队「${team.name}」？`)) return;
    setLeaving(true);
    try {
      await teamsAPI.leave(team.id);
      toast.success('已退出团队');
      onLeft(team.id);
    } catch (err) {
      toast.error(getApiError(err, '退出失败'));
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Modal open={!!team} onClose={onClose} title={team.name} width={520}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <StatusBadge status={team.status} />
          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{team.competition?.title || '未关联赛事'}</span>
        </div>
        <div>
          <SectionLabel label={`成员 (${team.members?.length || 0})`} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {(team.members || []).map((m, j) => (
              <div key={m.id ?? j} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar name={m.user?.name || '?'} size={28} index={j} />
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{m.user?.name}</span>
                <span style={{ marginLeft: 'auto', fontSize: 11, fontFamily: 'var(--font-mono)', color: m.role === 'leader' ? 'var(--amber)' : 'var(--text-3)' }}>
                  {m.role === 'leader' ? '队长' : '队员'}
                </span>
              </div>
            ))}
          </div>
        </div>
        {canLeave && (
          <div style={{ paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <Button variant="danger" size="sm" loading={leaving} onClick={leave}>退出团队</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
```
（`Avatar`、`SectionLabel`、`PageHeader` 来自 `page-helpers`；`Avatar`/`SectionLabel` 需在 import 里补上——把现有 `import { Avatar, PageHeader } from '@/components/ui/page-helpers';` 改为 `import { Avatar, PageHeader, SectionLabel } from '@/components/ui/page-helpers';`。）

- [ ] **Step 5: 类型检查 + lint**

Run: `npm run build` then `npm run lint`
Expected: `npm run build` 零错误（硬门槛）。`npm run lint` 总错误数不超过基线 13（即你改的文件未新增报错）。

- [ ] **Step 6: Manual smoke**

student 登录：「创建团队」→ 填名 + 选赛事 → 创建 → 列表出现新卡片；对自己作为「队员」的团队点详情 → 「退出团队」可用，点后从列表消失；对自己是「队长」的团队，详情里无退出按钮。重复对同一赛事建队 → toast 显示后端「已有团队」错误。

- [ ] **Step 7: Commit**

```bash
git add frontend-vite/src/pages/teams.tsx
git commit -m "feat(frontend): teams 页接通创建/详情/退出，并移除无后端支持的编辑按钮

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: preplans 页接线

**Files:**
- Modify: `frontend-vite/src/pages/preplans.tsx`

目标：「新建预计划」（student）→ 选我的团队（推导 competition_id）+ 标题 + 多段文本。

- [ ] **Step 1: 追加 imports**

```typescript
import { teamsAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { FormModal, Field, TextInput, TextArea, Select } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import type { Team } from '@/types';
```
（`prePlansAPI`、`PrePlan` 已 import。）

- [ ] **Step 2: 新增 `PrePlanForm`**

在 `PrePlansPage` 之前插入：
```tsx
type PrePlanFormState = {
  team_id: string; title: string; tech_stack: string; target_audience: string;
  market_analysis: string; innovation: string; expected_outcome: string; timeline: string;
};
function emptyPrePlanForm(): PrePlanFormState {
  return { team_id: '', title: '', tech_stack: '', target_audience: '', market_analysis: '', innovation: '', expected_outcome: '', timeline: '' };
}

function PrePlanForm({ onClose, teams, onCreated }: {
  onClose: () => void;
  teams: Team[];
  onCreated: (plan: PrePlan) => void;
}) {
  const [form, setForm] = useState<PrePlanFormState>(emptyPrePlanForm);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (k: keyof PrePlanFormState) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const teamOptions = teams.map((t) => ({ value: String(t.id), label: t.competition?.title ? `${t.name} · ${t.competition.title}` : t.name }));

  const submit = async () => {
    if (!form.team_id) { setError('请选择团队'); return; }
    if (!form.title.trim()) { setError('请填写方案标题'); return; }
    const team = teams.find((t) => String(t.id) === form.team_id);
    if (!team) { setError('团队无效'); return; }
    setSubmitting(true); setError(null);
    try {
      const res = await prePlansAPI.create({
        competition_id: team.competition_id,
        team_id: team.id,
        title: form.title.trim(),
        tech_stack: form.tech_stack,
        target_audience: form.target_audience,
        market_analysis: form.market_analysis,
        innovation: form.innovation,
        expected_outcome: form.expected_outcome,
        timeline: form.timeline,
      });
      toast.success('预计划已提交');
      onCreated(res.pre_plan);
      onClose();
    } catch (err) {
      setError(getApiError(err, '提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title="新建预计划" onSubmit={submit} submitting={submitting} error={error} submitLabel="提交" width={640}>
      {teams.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--text-3)', padding: '12px 0' }}>你还没有团队，请先到「团队管理」创建团队。</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="团队" required><Select value={form.team_id} onChange={set('team_id')} options={teamOptions} placeholder="选择团队" /></Field>
            <Field label="方案标题" required><TextInput value={form.title} onChange={(e) => set('title')(e.target.value)} placeholder="项目名称" /></Field>
          </div>
          <Field label="技术栈"><TextArea value={form.tech_stack} onChange={(e) => set('tech_stack')(e.target.value)} /></Field>
          <Field label="目标用户"><TextArea value={form.target_audience} onChange={(e) => set('target_audience')(e.target.value)} /></Field>
          <Field label="市场分析"><TextArea value={form.market_analysis} onChange={(e) => set('market_analysis')(e.target.value)} /></Field>
          <Field label="创新点"><TextArea value={form.innovation} onChange={(e) => set('innovation')(e.target.value)} /></Field>
          <Field label="预期成果"><TextArea value={form.expected_outcome} onChange={(e) => set('expected_outcome')(e.target.value)} /></Field>
          <Field label="时间规划"><TextArea value={form.timeline} onChange={(e) => set('timeline')(e.target.value)} /></Field>
        </>
      )}
    </FormModal>
  );
}
```

- [ ] **Step 3: `PrePlansPage` 状态/数据/接线**

3a. 在组件体内加载我的团队（供选择）：把现有 `useEffect` 之后加入：
```tsx
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  useEffect(() => { teamsAPI.list().then((r) => setMyTeams(r.teams || [])).catch(() => {}); }, []);

  const onCreated = (plan: PrePlan) => {
    setPreplans((prev) => [plan, ...prev]);
    setSelected(plan);
    setTab('detail');
  };
```

3b. 页头按钮：把
```tsx
        actions={role === 'student' ? <button className="btn btn-primary"><Icon name="plus" size={13}/>新建预计划</button> : undefined}
```
改为：
```tsx
        actions={role === 'student' ? <Button variant="primary" icon={<Icon name="plus" size={13}/>} onClick={() => setCreateOpen(true)}>新建预计划</Button> : undefined}
```

3c. 在 return 最外层闭合前加入：
```tsx
      {createOpen && <PrePlanForm onClose={() => setCreateOpen(false)} teams={myTeams} onCreated={onCreated} />}
```

- [ ] **Step 4: 类型检查 + lint**

Run: `npm run build` then `npm run lint`
Expected: `npm run build` 零错误（硬门槛）。`npm run lint` 总错误数不超过基线 13（即你改的文件未新增报错）。

- [ ] **Step 5: Manual smoke**

student 登录（需先有团队）：点「新建预计划」→ 选团队 + 填标题 + 若干文本 → 提交 → 左侧列表出现新项并自动选中 + 成功 toast。无团队时弹窗提示去创建团队。

- [ ] **Step 6: Commit**

```bash
git add frontend-vite/src/pages/preplans.tsx
git commit -m "feat(frontend): preplans 页接通新建预计划交互

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: evaluations 页接线

**Files:**
- Modify: `frontend-vite/src/pages/evaluations.tsx`

目标：「提交评价」（student）→ 选教师（来自 `stats/teachers`）+ 选赛事 + 四项星评 + 反馈。

- [ ] **Step 1: 追加 imports**

```typescript
import { statsAPI, competitionsAPI } from '@/services/api';
import { Button } from '@/components/ui/button';
import { FormModal, Field, Select, TextArea, RatingInput } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
import type { Competition, TeacherStat } from '@/types';
```
（`evaluationsAPI`、`StudentEvaluation` 已 import。）

- [ ] **Step 2: 新增 `EvaluationForm`**

在 `EvaluationsPage` 之前插入：
```tsx
function EvaluationForm({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: (ev: StudentEvaluation) => void;
}) {
  const [teachers, setTeachers] = useState<TeacherStat[]>([]);
  const [comps, setComps] = useState<Competition[]>([]);
  const [teacherId, setTeacherId] = useState('');
  const [compId, setCompId] = useState('');
  const [scores, setScores] = useState({ teaching: 0, communication: 0, availability: 0, overall: 0 });
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 仅在挂载时拉取下拉数据；.then 回调里的 setState 是异步的，不触发 set-state-in-effect。
  useEffect(() => {
    statsAPI.teachers().then((r) => setTeachers(r.teachers || [])).catch(() => {});
    competitionsAPI.list().then((r) => setComps(r.competitions || [])).catch(() => {});
  }, []);

  const submit = async () => {
    if (!teacherId) { setError('请选择教师'); return; }
    if (!compId) { setError('请选择赛事'); return; }
    if (!scores.teaching || !scores.communication || !scores.availability || !scores.overall) {
      setError('请完成四项评分（各 1–5 星）'); return;
    }
    setSubmitting(true); setError(null);
    try {
      const res = await evaluationsAPI.create({
        teacher_id: Number(teacherId),
        competition_id: Number(compId),
        ...scores,
        feedback,
      });
      toast.success('评价已提交');
      onCreated(res.evaluation);
      onClose();
    } catch (err) {
      setError(getApiError(err, '提交失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title="提交评价" onSubmit={submit} submitting={submitting} error={error} submitLabel="提交" width={560}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="教师" required>
          <Select value={teacherId} onChange={setTeacherId} placeholder="选择教师"
            options={teachers.map((t) => ({ value: String(t.id), label: t.name }))} />
        </Field>
        <Field label="赛事" required>
          <Select value={compId} onChange={setCompId} placeholder="选择赛事"
            options={comps.map((c) => ({ value: String(c.id), label: c.title }))} />
        </Field>
      </div>
      {([
        { k: 'teaching', l: '教学' },
        { k: 'communication', l: '沟通' },
        { k: 'availability', l: '及时性' },
        { k: 'overall', l: '综合' },
      ] as const).map(({ k, l }) => (
        <Field key={k} label={l} required>
          <RatingInput value={scores[k]} onChange={(v) => setScores((s) => ({ ...s, [k]: v }))} />
        </Field>
      ))}
      <Field label="文字反馈"><TextArea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="可选：写下具体反馈" /></Field>
    </FormModal>
  );
}
```

> 注：`TeacherStat` 类型当前声明的字段与 `stats/teachers` 实际返回不完全一致，但 `id`、`name` 两个字段两者都有且本表单只用这两个，类型安全。

- [ ] **Step 3: `EvaluationsPage` 状态与接线**

3a. 组件体内 `useEffect` 之后加入：
```tsx
  const [createOpen, setCreateOpen] = useState(false);
  const onCreated = (ev: StudentEvaluation) => setEvaluations((prev) => [ev, ...prev]);
```

3b. 把「提交评价」按钮：
```tsx
          {role === 'student' && <button className="btn btn-primary btn-sm"><Icon name="plus" size={12}/> 提交评价</button>}
```
改为：
```tsx
          {role === 'student' && <Button variant="primary" size="sm" icon={<Icon name="plus" size={12}/>} onClick={() => setCreateOpen(true)}>提交评价</Button>}
```

3c. return 最外层闭合前加入：
```tsx
      {createOpen && <EvaluationForm onClose={() => setCreateOpen(false)} onCreated={onCreated} />}
```

并在顶部 import 补 `Button`（若 3a/3b 已加则忽略）。

- [ ] **Step 4: 类型检查 + lint**

Run: `npm run build` then `npm run lint`
Expected: `npm run build` 零错误（硬门槛）。`npm run lint` 总错误数不超过基线 13（即你改的文件未新增报错）。

- [ ] **Step 5: Manual smoke**

student 登录：点「提交评价」→ 选教师 + 赛事 + 四项点星 + 反馈 → 提交 → 列表前插新评价 + 成功 toast。漏点某项星 → 内联错误提示。对同一教师同赛事重复提交 → toast 显示后端「已评价」错误。

- [ ] **Step 6: Commit**

```bash
git add frontend-vite/src/pages/evaluations.tsx
git commit -m "feat(frontend): evaluations 页接通提交评价交互

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 9: awards 页结算

**Files:**
- Modify: `frontend-vite/src/pages/awards.tsx`

目标：表格新增「操作」列；admin 对未结算奖项点「结算」→ 可编辑奖金 → 结算。

- [ ] **Step 1: 追加 imports**

```typescript
import { useRole } from '@/hooks/use-role';
import { Button } from '@/components/ui/button';
import { FormModal, Field, NumberInput } from '@/components/ui/form';
import { toast } from '@/components/ui/toast';
import { getApiError } from '@/lib/form-utils';
```
（`awardsAPI`、`Award` 已 import。）

- [ ] **Step 2: 新增 `SettleAwardModal`**

在 `AwardsPage` 之前插入：
```tsx
function SettleAwardModal({ award, onClose, onSettled }: {
  award: Award;
  onClose: () => void;
  onSettled: (a: Award) => void;
}) {
  const [amount, setAmount] = useState<string>(() => String(Number(award.prize_amount || 0)));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true); setError(null);
    try {
      const res = await awardsAPI.settle(award.id, Number(amount) || 0);
      toast.success('奖项已结算');
      onSettled(res.award);
      onClose();
    } catch (err) {
      setError(getApiError(err, '结算失败'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormModal open={true} onClose={onClose} title={`结算奖项 · ${award.team?.name || ''}`} onSubmit={submit} submitting={submitting} error={error} submitLabel="确认结算" width={440}>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{award.competition?.title || ''} · {award.rank_name || `第 ${award.rank} 名`}</div>
      <Field label="结算奖金（元）"><NumberInput min={0} value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
    </FormModal>
  );
}
```

- [ ] **Step 3: `AwardsPage` 状态 + 表格列**

3a. 组件体内 `useEffect` 之后加入：
```tsx
  const role = useRole();
  const [settling, setSettling] = useState<Award | null>(null);
  const onSettled = (a: Award) => setAwards((prev) => prev.map((x) => (x.id === a.id ? a : x)));
```

3b. 表头加一列：把
```tsx
          <thead><tr><th>排名</th><th>团队</th><th>赛事</th><th>奖项</th><th>奖金</th><th>状态</th></tr></thead>
```
改为：
```tsx
          <thead><tr><th>排名</th><th>团队</th><th>赛事</th><th>奖项</th><th>奖金</th><th>状态</th><th>操作</th></tr></thead>
```

3c. 行末加一格：在每行 `<td><StatusBadge status={award.status}/></td>` 之后追加：
```tsx
                <td>
                  {role === 'admin' && award.status !== 'settled'
                    ? <Button variant="outline" size="sm" onClick={() => setSettling(award)}>结算</Button>
                    : <span style={{ color: 'var(--text-3)' }}>—</span>}
                </td>
```

3d. return 最外层闭合前加入：
```tsx
      {settling && <SettleAwardModal award={settling} onClose={() => setSettling(null)} onSettled={onSettled} />}
```

- [ ] **Step 4: 类型检查 + lint**

Run: `npm run build` then `npm run lint`
Expected: `npm run build` 零错误（硬门槛）。`npm run lint` 总错误数不超过基线 13（即你改的文件未新增报错）。

- [ ] **Step 5: Manual smoke**

admin 登录：在「待处理/教师确认」状态的奖项行点「结算」→ 弹窗确认/改奖金 → 确认 → 行状态变「已结算」、操作列变 `—` + 成功 toast。非 admin 角色操作列恒为 `—`。

- [ ] **Step 6: Commit**

```bash
git add frontend-vite/src/pages/awards.tsx
git commit -m "feat(frontend): awards 页新增结算操作

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 10: 全量验证收尾

- [ ] **Step 1: 全量构建 + lint**

Run（在 `frontend-vite/`）：
```bash
npm run build
npm run lint
```
Expected: 两者均零错误。

- [ ] **Step 2: 跨页冒烟回归**

依次复核 Task 5–9 的 Manual smoke 关键路径各一遍，确认成功 toast 与失败 toast（构造一次后端会拒绝的操作，如重复建队）都正常显示，弹窗在成功后关闭、失败时保留并显示内联错误。

- [ ] **Step 3:（可选）更新规范状态**

如需，把 spec 顶部「状态」改为「已实现」。提交：
```bash
git add docs/superpowers/specs/2026-06-10-frontend-write-interactions-design.md
git commit -m "docs: 标记前端写交互规范为已实现

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## （可选）Task 11: 为纯函数补单元测试

> 仅在需方要求时执行。spec §9 将其列为可选。

**Files:**
- Modify: `frontend-vite/package.json`（加 `vitest` 依赖与 `test` 脚本）
- Create: `frontend-vite/src/lib/form-utils.test.ts`

- [ ] **Step 1: 安装 vitest**

Run（在 `frontend-vite/`）：`npm i -D vitest`
并在 `package.json` `scripts` 加：`"test": "vitest run"`

- [ ] **Step 2: 写测试**

```typescript
import { describe, it, expect } from 'vitest';
import { localInputToISO, isoToLocalInput, getApiError } from './form-utils';

describe('form-utils', () => {
  it('localInputToISO 空串返回空串', () => {
    expect(localInputToISO('')).toBe('');
  });
  it('localInputToISO 把本地时间转成 ISO（可被 Date 解析回同一时刻）', () => {
    const iso = localInputToISO('2026-06-10T09:30');
    expect(new Date(iso).getTime()).toBe(new Date('2026-06-10T09:30').getTime());
  });
  it('isoToLocalInput 往返一致', () => {
    const local = '2026-06-10T09:30';
    expect(isoToLocalInput(localInputToISO(local))).toBe(local);
  });
  it('isoToLocalInput 非法/空返回空串', () => {
    expect(isoToLocalInput(undefined)).toBe('');
    expect(isoToLocalInput('not-a-date')).toBe('');
  });
  it('getApiError 非 axios 错误用 fallback', () => {
    expect(getApiError(new Error('x'), '默认')).toBe('默认');
  });
});
```

- [ ] **Step 3: 跑测试**

Run: `npm test`
Expected: 全部 PASS。

- [ ] **Step 4: Commit**

```bash
git add frontend-vite/package.json frontend-vite/package-lock.json frontend-vite/src/lib/form-utils.test.ts
git commit -m "test(frontend): 为 form-utils 纯函数补单元测试

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review 说明（写计划时已核对）

- **Spec 覆盖**：competitions（创建/编辑/删除/发布/详情/报名）→ Task 5；teams（创建/详情/退出、移除编辑）→ Task 6；preplans（新建）→ Task 7；evaluations（提交）→ Task 8；awards（结算 + settle body）→ Task 4/9；共享 FormModal/原语 → Task 3；toast → Task 2；纯函数 → Task 1；角色门槛与「报名=建队」「移除团队编辑」「含赛事删除」三项决策已分别落到 Task 5/6。
- **类型一致**：`TeamForm`（Task 6 导出，Task 5 复用）、`CompetitionForm` 的 `onSaved`/`onDeleted`、`awardsAPI.settle(id, prizeAmount)`（Task 4 定义，Task 9 调用）签名前后一致。
- **占位**：无 TBD/TODO；所有改动均给出完整代码或精确替换锚点。
