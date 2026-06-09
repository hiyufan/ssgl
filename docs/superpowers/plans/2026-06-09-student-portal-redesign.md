# Student Portal Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the industrial FORGE visual design for the student portal with an immersive Aurora + Bento glassmorphism experience, while keeping Admin/Teacher portals unchanged.

**Architecture:** Student-specific components live in `components/student-ui/`, student-specific CSS in `styles/student.css`. App.tsx switches layout based on role. Shared data layer (stores, API, types) is untouched.

**Tech Stack:** React 18, TypeScript, CSS (no animation libraries), Google Fonts (Caveat), SVG (ScoreRing, WaveProgress)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `index.html` | Add Caveat font |
| Create | `src/styles/student.css` | Student design tokens, aurora animations, glass styles |
| Create | `src/components/student-ui/aurora-bg.tsx` | Animated aurora background |
| Create | `src/components/student-ui/glass-card.tsx` | Glassmorphism card component |
| Create | `src/components/student-ui/bento-grid.tsx` | Bento Grid layout container |
| Create | `src/components/student-ui/score-ring.tsx` | Circular score display with gradient |
| Create | `src/components/student-ui/wave-progress.tsx` | Liquid-style progress bar |
| Create | `src/components/student-ui/member-avatar.tsx` | Team member avatar with glow |
| Create | `src/components/student-ui/student-sidebar.tsx` | Student-specific sidebar |
| Create | `src/components/student-ui/student-layout.tsx` | Student layout wrapper |
| Modify | `src/App.tsx` | Role-based layout switching |
| Rewrite | `src/pages/login.tsx` | Aurora login page (all roles) |
| Rewrite | `src/pages/dashboard/student.tsx` | Bento Grid dashboard |

---

### Task 1: Add Caveat Font

**Files:**
- Modify: `frontend-vite/index.html:10`

- [ ] **Step 1: Add Caveat to Google Fonts link**

Replace the Google Fonts `<link>` in `index.html` to include Caveat:

```html
<link href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=Unbounded:wght@400;700;900&family=Plus+Jakarta+Sans:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
```

- [ ] **Step 2: Verify font loads**

Open the app in browser, check DevTools → Network → filter `fonts.googleapis.com`. Confirm the Caveat font CSS is returned.

---

### Task 2: Create Student CSS Foundation

**Files:**
- Create: `frontend-vite/src/styles/student.css`

- [ ] **Step 1: Create student.css with all design tokens and animations**

```css
/* ═══════════════════════════════════════
   STUDENT PORTAL · Aurora + Bento Design
   ═══════════════════════════════════════ */

/* ─── Design Tokens ─────────────────────────── */
.student-root {
  --s-bg:           #0A0B14;
  --s-surface:      rgba(255, 255, 255, 0.03);
  --s-surface-hover: rgba(255, 255, 255, 0.06);
  --s-border:       rgba(255, 255, 255, 0.06);
  --s-border-hover: rgba(167, 139, 250, 0.25);

  --s-text-1:  #EDF0F9;
  --s-text-2:  #8693B0;
  --s-text-3:  #4E5C78;

  --s-purple:      #A78BFA;
  --s-purple-deep: #8B5CF6;
  --s-amber:       #F0A832;
  --s-green:       #4ADE80;
  --s-red:         #F87171;
  --s-orange:      #FB923C;

  --s-gradient:    linear-gradient(135deg, #A78BFA, #F0A832);
  --s-gradient-r:  linear-gradient(135deg, #F0A832, #A78BFA);

  --s-radius:      20px;
  --s-radius-btn:  14px;
  --s-radius-sm:   10px;

  --s-shadow:      0 4px 24px rgba(0, 0, 0, 0.2);
  --s-shadow-hover: 0 12px 40px rgba(167, 139, 250, 0.12),
                    0 0 0 1px rgba(167, 139, 250, 0.1);
  --s-shadow-glow: 0 2px 8px rgba(167, 139, 250, 0.2);

  --s-blur:        blur(24px) saturate(1.4);

  --s-font-body:   'Plus Jakarta Sans', -apple-system, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  --s-font-hand:   'Caveat', cursive;
  --s-font-mono:   'JetBrains Mono', 'Fira Code', monospace;

  --s-sidebar-w:   232px;
  --s-topbar-h:    56px;
}

/* ─── Aurora Keyframes ──────────────────────── */
@keyframes s-aurora-drift-1 {
  0%   { transform: translate(0, 0) rotate(0deg) scale(1); }
  33%  { transform: translate(100px, -60px) rotate(120deg) scale(1.1); }
  66%  { transform: translate(-50px, 80px) rotate(240deg) scale(0.95); }
  100% { transform: translate(0, 0) rotate(360deg) scale(1); }
}
@keyframes s-aurora-drift-2 {
  0%   { transform: translate(0, 0) rotate(0deg) scale(1); }
  33%  { transform: translate(-80px, 50px) rotate(-120deg) scale(1.05); }
  66%  { transform: translate(60px, -70px) rotate(-240deg) scale(0.9); }
  100% { transform: translate(0, 0) rotate(-360deg) scale(1); }
}
@keyframes s-aurora-drift-3 {
  0%   { transform: translate(0, 0) rotate(0deg); }
  50%  { transform: translate(70px, 40px) rotate(180deg); }
  100% { transform: translate(0, 0) rotate(360deg); }
}

/* ─── Card Entry Animation ──────────────────── */
@keyframes s-card-enter {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.96);
    filter: blur(4px);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
    filter: blur(0);
  }
}

/* ─── Wave Animation ────────────────────────── */
@keyframes s-wave {
  0%, 100% { d: path('M0,4 Q10,0 20,4 Q30,8 40,4'); }
  50%      { d: path('M0,4 Q10,8 20,4 Q30,0 40,4'); }
}

/* ─── Breathe Animation ─────────────────────── */
@keyframes s-breathe {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1; transform: scale(1.05); }
}

/* ─── Page Enter ────────────────────────────── */
@keyframes s-page-enter {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* ─── Reduced Motion ────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .student-root *,
  .student-root *::before,
  .student-root *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [ ] **Step 2: Verify CSS loads without errors**

Run `npm run dev`, open browser. Check DevTools → Console for CSS parse errors. Expected: none.

---

### Task 3: Build Aurora Background Component

**Files:**
- Create: `frontend-vite/src/components/student-ui/aurora-bg.tsx`

- [ ] **Step 1: Create aurora-bg.tsx**

```tsx
import { memo } from 'react';

export const AuroraBg = memo(function AuroraBg() {
  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 0,
      background: '#0A0B14',
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* Blob 1 — purple, top-left */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '-10%',
        width: 650,
        height: 650,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)',
        filter: 'blur(120px)',
        animation: 's-aurora-drift-1 25s ease-in-out infinite',
      }} />
      {/* Blob 2 — amber, bottom-right */}
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-10%',
        width: 550,
        height: 550,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(240,168,50,0.15) 0%, transparent 70%)',
        filter: 'blur(120px)',
        animation: 's-aurora-drift-2 30s ease-in-out infinite',
      }} />
      {/* Blob 3 — deep purple, center */}
      <div style={{
        position: 'absolute',
        top: '30%',
        left: '40%',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)',
        filter: 'blur(120px)',
        animation: 's-aurora-drift-3 20s ease-in-out infinite',
      }} />
      {/* Subtle noise overlay for texture */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.03\'/%3E%3C/svg%3E")',
        opacity: 0.4,
      }} />
    </div>
  );
});
```

- [ ] **Step 2: Verify component renders**

Import `AuroraBg` in any page temporarily, confirm the animated gradient background appears.

---

### Task 4: Build Glass Card Component

**Files:**
- Create: `frontend-vite/src/components/student-ui/glass-card.tsx`

- [ ] **Step 1: Create glass-card.tsx**

```tsx
import type { ReactNode, CSSProperties } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  hoverable?: boolean;
  span?: number;       // grid column span
  rowSpan?: number;    // grid row span
  onClick?: () => void;
}

export function GlassCard({
  children,
  className = '',
  style,
  hoverable = true,
  span,
  rowSpan,
  onClick,
}: GlassCardProps) {
  return (
    <div
      className={`s-glass-card ${hoverable ? 's-glass-hover' : ''} ${className}`}
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        backdropFilter: 'blur(24px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
        borderRadius: 20,
        padding: 24,
        cursor: onClick ? 'pointer' : undefined,
        gridColumn: span ? `span ${span}` : undefined,
        gridRow: rowSpan ? `span ${rowSpan}` : undefined,
        ...style,
      }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Add hover CSS to student.css**

Append to `frontend-vite/src/styles/student.css`:

```css
/* ─── Glass Card Hover ──────────────────────── */
.s-glass-hover {
  transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
              box-shadow 0.4s,
              border-color 0.3s;
}
.s-glass-hover:hover {
  transform: translateY(-4px) scale(1.01);
  border-color: rgba(167, 139, 250, 0.25);
  box-shadow: 0 12px 40px rgba(167, 139, 250, 0.12),
              0 0 0 1px rgba(167, 139, 250, 0.1);
}

/* ─── Card Entry Animation Utility ──────────── */
.s-card-enter {
  animation: s-card-enter 0.5s cubic-bezier(0.16, 1, 0.3, 1) both;
}
.s-card-enter-d1 { animation-delay: 0.05s; }
.s-card-enter-d2 { animation-delay: 0.10s; }
.s-card-enter-d3 { animation-delay: 0.15s; }
.s-card-enter-d4 { animation-delay: 0.20s; }
.s-card-enter-d5 { animation-delay: 0.25s; }
.s-card-enter-d6 { animation-delay: 0.30s; }
```

- [ ] **Step 3: Verify glass effect renders**

Import `GlassCard` in a test page, confirm the frosted glass appearance with blur on a dark background.

---

### Task 5: Build Bento Grid Component

**Files:**
- Create: `frontend-vite/src/components/student-ui/bento-grid.tsx`

- [ ] **Step 1: Create bento-grid.tsx**

```tsx
import type { ReactNode, CSSProperties } from 'react';

interface BentoGridProps {
  children: ReactNode;
  columns?: number;
  className?: string;
  style?: CSSProperties;
}

export function BentoGrid({ children, columns = 3, className = '', style }: BentoGridProps) {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gridAutoRows: 'minmax(180px, auto)',
        gap: 16,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Verify grid renders**

Create a test with 6 `GlassCard` children, confirm 3-column layout with varying spans.

---

### Task 6: Build Score Ring Component

**Files:**
- Create: `frontend-vite/src/components/student-ui/score-ring.tsx`

- [ ] **Step 1: Create score-ring.tsx**

```tsx
import { useState, useEffect } from 'react';

interface ScoreRingProps {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreRing({ score, size = 120, label = 'AI 评分' }: ScoreRingProps) {
  const [animated, setAnimated] = useState(false);
  const [displayed, setDisplayed] = useState(0);

  const r = size * 0.4;
  const circ = 2 * Math.PI * r;
  const cx = size / 2;
  const cy = size / 2;
  const offset = animated ? circ * (1 - score / 100) : circ;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!animated) return;
    const start = performance.now();
    const duration = 1200;
    let rafId: number;
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplayed(Math.round(eased * score));
      if (p < 1) rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [animated, score]);

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ display: 'block' }}>
        <defs>
          <linearGradient id={`s-ring-grad-${score}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#F0A832" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        {/* Fill */}
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={`url(#s-ring-grad-${score})`}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: `${cx}px ${cy}px`,
            transition: 'stroke-dashoffset 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      }}>
        <span style={{
          fontFamily: 'var(--s-font-mono)',
          fontSize: size * 0.24,
          fontWeight: 700,
          color: 'var(--s-text-1)',
          lineHeight: 1,
        }}>
          {displayed}
        </span>
        <span style={{
          fontFamily: 'var(--s-font-body)',
          fontSize: Math.max(9, size * 0.08),
          color: 'var(--s-text-3)',
          fontWeight: 600,
        }}>
          {label}
        </span>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify ring animation**

Render `<ScoreRing score={78} />` inside a glass card on the aurora background. Confirm the gradient ring fills from 0 to 78.

---

### Task 7: Build Wave Progress Component

**Files:**
- Create: `frontend-vite/src/components/student-ui/wave-progress.tsx`

- [ ] **Step 1: Create wave-progress.tsx**

```tsx
import { useEffect, useState } from 'react';

interface WaveProgressProps {
  value: number;    // 0-100
  height?: number;
  label?: string;
}

export function WaveProgress({ value, height = 8, label }: WaveProgressProps) {
  const [animated, setAnimated] = useState(false);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 400); return () => clearTimeout(t); }, []);

  const pct = Math.min(100, Math.max(0, value));

  return (
    <div style={{ width: '100%' }}>
      {label && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6,
        }}>
          <span style={{ fontSize: 12, color: 'var(--s-text-2)', fontWeight: 500 }}>{label}</span>
          <span style={{ fontFamily: 'var(--s-font-mono)', fontSize: 12, color: 'var(--s-text-1)', fontWeight: 600 }}>
            {pct}%
          </span>
        </div>
      )}
      <div style={{
        height,
        borderRadius: height,
        background: 'rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
        position: 'relative',
      }}>
        <div style={{
          height: '100%',
          width: animated ? `${pct}%` : '0%',
          borderRadius: height,
          background: 'linear-gradient(90deg, #A78BFA, #F0A832)',
          transition: 'width 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
          position: 'relative',
        }}>
          {/* Wave head effect */}
          <svg
            viewBox="0 0 40 8"
            style={{
              position: 'absolute',
              right: -20,
              top: 0,
              width: 40,
              height: height,
              opacity: animated ? 1 : 0,
              transition: 'opacity 0.5s ease 1s',
            }}
            preserveAspectRatio="none"
          >
            <path
              d="M0,4 Q10,0 20,4 Q30,8 40,4"
              fill="none"
              stroke="rgba(240,168,50,0.4)"
              strokeWidth="2"
              style={{ animation: 's-wave 2s ease-in-out infinite' }}
            />
          </svg>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify progress animation**

Render `<WaveProgress value={60} label="总体进度" />` inside a glass card. Confirm the gradient bar fills and the wave head animates.

---

### Task 8: Build Member Avatar Component

**Files:**
- Create: `frontend-vite/src/components/student-ui/member-avatar.tsx`

- [ ] **Step 1: Create member-avatar.tsx**

```tsx
interface MemberAvatarProps {
  name: string;
  size?: number;
  index?: number;
  role?: string;
}

const COLORS = ['#A78BFA', '#F0A832', '#4ADE80', '#FB923C', '#F87171', '#2DD4BF'];

export function MemberAvatar({ name, size = 36, index = 0, role }: MemberAvatarProps) {
  const color = COLORS[index % COLORS.length];
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    }}>
      <div style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: `${color}22`,
        border: `2px solid ${color}44`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 700,
        color,
        transition: 'box-shadow 0.3s, border-color 0.3s',
        cursor: 'default',
      }}
        onMouseEnter={e => {
          e.currentTarget.style.boxShadow = `0 0 16px ${color}44`;
          e.currentTarget.style.borderColor = `${color}88`;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.borderColor = `${color}44`;
        }}
      >
        {name[0]?.toUpperCase() || '?'}
      </div>
      {role && (
        <span style={{
          fontSize: 10,
          color: 'var(--s-text-3)',
          fontWeight: 500,
        }}>
          {role}
        </span>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify avatar renders**

Render a few `<MemberAvatar name="张明" index={0} role="队长" />` instances. Confirm colored circles with initials.

---

### Task 9: Build Student Sidebar

**Files:**
- Create: `frontend-vite/src/components/student-ui/student-sidebar.tsx`

- [ ] **Step 1: Create student-sidebar.tsx**

```tsx
import { useState } from 'react';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';

const NAV = [
  { id: 'dashboard', icon: '◉', label: '概览' },
  { section: '我的赛事' },
  { id: 'competitions', icon: '◈', label: '赛事大厅' },
  { id: 'teams', icon: '◎', label: '我的团队' },
  { section: '项目管理' },
  { id: 'preplans', icon: '◇', label: '预计划' },
  { section: '智能助手' },
  { id: 'aitools', icon: '✦', label: 'AI 工具箱' },
  { section: '反馈' },
  { id: 'evaluations', icon: '✧', label: '评价导师' },
];

export function StudentSidebar() {
  const { page, navigate } = useAppStore();
  const { user } = useAuthStore();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside style={{
      width: collapsed ? 64 : 220,
      minWidth: collapsed ? 64 : 220,
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(255, 255, 255, 0.02)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: '1px solid rgba(255, 255, 255, 0.06)',
      overflow: 'hidden',
      transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
    }}>
      {/* Logo */}
      <div style={{
        height: 56, display: 'flex', alignItems: 'center', gap: 10,
        padding: '0 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        flexShrink: 0, cursor: 'pointer',
      }} onClick={() => setCollapsed(!collapsed)}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg, #A78BFA, #F0A832)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="1" y="7" width="4" height="6" fill="#0F1523" rx="1"/>
            <rect x="5" y="4" width="4" height="9" fill="#0F1523" rx="1"/>
            <rect x="9" y="1" width="4" height="12" fill="#0F1523" rx="1"/>
          </svg>
        </div>
        {!collapsed && (
          <div>
            <div style={{
              fontFamily: 'var(--s-font-body)', fontWeight: 700, fontSize: 13,
              letterSpacing: '0.04em', color: 'var(--s-text-1)',
            }}>
              FORGE
            </div>
            <div style={{
              fontSize: 9, fontWeight: 600, letterSpacing: '0.12em',
              color: 'var(--s-text-3)', textTransform: 'uppercase', marginTop: 1,
            }}>
              竞赛管理平台
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        {NAV.map((item, i) => {
          if (item.section) {
            if (collapsed) return <div key={i} style={{ height: 8 }} />;
            return (
              <div key={i} style={{
                padding: '16px 12px 4px', fontSize: 10, fontWeight: 700,
                letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--s-text-3)',
              }}>
                {item.section}
              </div>
            );
          }
          const active = page === item.id;
          return (
            <button key={item.id} onClick={() => navigate(item.id!)} style={{
              display: 'flex', alignItems: 'center', gap: 10, width: '100%',
              padding: collapsed ? '10px 0' : '8px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              borderRadius: 10, border: 'none', cursor: 'pointer',
              background: active ? 'rgba(167, 139, 250, 0.1)' : 'transparent',
              color: active ? '#A78BFA' : 'var(--s-text-2)',
              fontWeight: active ? 600 : 500,
              fontSize: 13,
              transition: 'background 0.15s, color 0.15s',
              position: 'relative',
            }}>
              {active && !collapsed && (
                <div style={{
                  position: 'absolute', left: 0, top: '25%', height: '50%',
                  width: 3, borderRadius: '0 2px 2px 0',
                  background: 'linear-gradient(180deg, #A78BFA, #F0A832)',
                }} />
              )}
              <span style={{ fontSize: 15, flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && <span style={{ flex: 1, textAlign: 'left' }}>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {/* User */}
      <div style={{
        padding: 8, borderTop: '1px solid rgba(255, 255, 255, 0.06)', flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px',
          borderRadius: 10, background: 'rgba(255, 255, 255, 0.03)',
        }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%',
            background: 'rgba(167, 139, 250, 0.15)',
            border: '2px solid rgba(167, 139, 250, 0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#A78BFA', flexShrink: 0,
          }}>
            {(user?.name || 'S')[0]}
          </div>
          {!collapsed && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontWeight: 600, color: 'var(--s-text-1)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {user?.name || '学生'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--s-text-3)', marginTop: 1 }}>参赛学生</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: Verify sidebar renders**

Confirm the sidebar shows with glass background, purple active states, and gradient logo.

---

### Task 10: Build Student Layout

**Files:**
- Create: `frontend-vite/src/components/student-ui/student-layout.tsx`

- [ ] **Step 1: Create student-layout.tsx**

```tsx
import type { ReactNode } from 'react';
import { AuroraBg } from './aurora-bg';
import { StudentSidebar } from './student-sidebar';

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  return (
    <div className="student-root" style={{
      display: 'flex',
      height: '100vh',
      background: '#0A0B14',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <AuroraBg />
      <StudentSidebar />
      <main style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
      }}>
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '28px 32px',
        }}>
          <div style={{ animation: 's-page-enter 0.35s cubic-bezier(0.16, 1, 0.3, 1) both' }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Import student.css in student-layout.tsx**

Add at the top of `student-layout.tsx`:

```tsx
import '@/styles/student.css';
```

- [ ] **Step 3: Verify full layout renders**

Temporarily wrap any page in `<StudentLayout>`. Confirm aurora background + sidebar + content area all render together.

---

### Task 11: Modify App.tsx for Role-Based Layout

**Files:**
- Modify: `frontend-vite/src/App.tsx`

- [ ] **Step 1: Add student layout import**

Add import at top of `App.tsx`:

```tsx
import { StudentLayout } from '@/components/student-ui/student-layout';
```

- [ ] **Step 2: Wrap render with role-based layout**

Replace the return block in `App.tsx` with:

```tsx
const content = (
  <div key={page} className={role === 'student' ? '' : 'forge-page-wrapper'}>
    {renderPage()}
  </div>
);

if (role === 'student') {
  return <StudentLayout>{content}</StudentLayout>;
}

return (
  <DashboardLayout>
    {content}
  </DashboardLayout>
);
```

- [ ] **Step 3: Verify role switching**

Login as admin → see FORGE layout. Switch to student → see aurora layout. Switch back → FORGE again.

---

### Task 12: Rewrite Student Dashboard

**Files:**
- Rewrite: `frontend-vite/src/pages/dashboard/student.tsx`

- [ ] **Step 1: Rewrite student.tsx with Bento Grid**

Replace the entire contents of `frontend-vite/src/pages/dashboard/student.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { useAppStore } from '@/stores/app';
import { teamsAPI, prePlansAPI, competitionsAPI } from '@/services/api';
import { GlassCard } from '@/components/student-ui/glass-card';
import { BentoGrid } from '@/components/student-ui/bento-grid';
import { ScoreRing } from '@/components/student-ui/score-ring';
import { WaveProgress } from '@/components/student-ui/wave-progress';
import { MemberAvatar } from '@/components/student-ui/member-avatar';
import type { Team, PrePlan, Competition } from '@/types';

export function StudentDashboard() {
  const { user } = useAuthStore();
  const { navigate } = useAppStore();
  const [teams, setTeams] = useState<Team[]>([]);
  const [preplans, setPreplans] = useState<PrePlan[]>([]);
  const [competitions, setCompetitions] = useState<Competition[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [teamRes, planRes, compRes] = await Promise.all([
          teamsAPI.list(),
          prePlansAPI.list(),
          competitionsAPI.list(),
        ]);
        setTeams(teamRes.teams || []);
        setPreplans(planRes.pre_plans || []);
        setCompetitions(compRes.competitions || []);
      } catch (e) {
        console.error('Student dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
        <svg width={32} height={32} viewBox="0 0 24 24" style={{ animation: 's-breathe 2s ease-in-out infinite' }}>
          <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2.5"/>
          <path d="M12 2a10 10 0 0110 10" fill="none" stroke="url(#load-grad)" strokeWidth="2.5" strokeLinecap="round"/>
          <defs>
            <linearGradient id="load-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#A78BFA"/>
              <stop offset="100%" stopColor="#F0A832"/>
            </linearGradient>
          </defs>
        </svg>
      </div>
    );
  }

  const myTeam = teams[0];
  const myPlan = preplans[0];
  const openComps = competitions.filter(c => c.status === 'published' || c.status === 'ongoing');

  const steps = [
    { label: '注册', done: true },
    { label: '组队', done: !!myTeam },
    { label: '预计划', done: myPlan?.status === 'approved', active: !!myPlan && myPlan.status !== 'approved' },
    { label: '执行', done: false },
    { label: '获奖', done: false },
  ];

  return (
    <div>
      <BentoGrid columns={3}>
        {/* Card 1: Greeting — spans 2 cols */}
        <GlassCard span={2} hoverable={false} className="s-card-enter s-card-enter-d1">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{
                fontFamily: 'var(--s-font-hand)', fontSize: 32, fontWeight: 500,
                color: 'var(--s-text-1)', lineHeight: 1.2, marginBottom: 8,
              }}>
                加油，{user?.name || '同学'}！
              </div>
              <div style={{ fontSize: 14, color: 'var(--s-text-2)' }}>
                {myTeam ? `团队：${myTeam.name}` : '还没有加入团队'}
              </div>
              <div style={{ fontSize: 13, color: 'var(--s-text-3)', marginTop: 4 }}>
                {openComps.length} 个赛事正在进行
              </div>
            </div>
            <ScoreRing score={myPlan?.ai_review_score || 0} size={100} label="AI 评分" />
          </div>
        </GlassCard>

        {/* Card 2: PrePlan Status */}
        <GlassCard className="s-card-enter s-card-enter-d2" onClick={() => navigate('preplans')}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--s-text-3)', marginBottom: 12 }}>
            预计划
          </div>
          {myPlan ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--s-text-1)', marginBottom: 8 }}>
                {myPlan.title}
              </div>
              <div style={{
                display: 'inline-block', padding: '3px 10px', borderRadius: 20,
                background: myPlan.status === 'approved' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(240, 168, 50, 0.1)',
                color: myPlan.status === 'approved' ? '#4ADE80' : '#F0A832',
                fontSize: 11, fontWeight: 600,
              }}>
                {myPlan.status === 'approved' ? '已通过' : myPlan.status === 'pending' ? '审核中' : '草稿'}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--s-text-3)', fontSize: 13 }}>还没有预计划</div>
          )}
        </GlassCard>

        {/* Card 3: My Team */}
        <GlassCard className="s-card-enter s-card-enter-d3" onClick={() => navigate('teams')}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--s-text-3)', marginBottom: 12 }}>
            我的团队
          </div>
          {myTeam ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--s-text-1)', marginBottom: 4 }}>
                {myTeam.name}
              </div>
              <div style={{ fontSize: 12, color: 'var(--s-text-3)', marginBottom: 12 }}>
                {myTeam.competition?.title || '—'}
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(myTeam.members || []).map((m, i) => (
                  <MemberAvatar key={i} name={m.user?.name || '?'} size={32} index={i} role={m.role === 'leader' ? '队长' : '队员'} />
                ))}
              </div>
            </>
          ) : (
            <div style={{ color: 'var(--s-text-3)', fontSize: 13 }}>还没有加入团队</div>
          )}
        </GlassCard>

        {/* Card 4: Competition Progress */}
        <GlassCard className="s-card-enter s-card-enter-d4" hoverable={false}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--s-text-3)', marginBottom: 16 }}>
            竞赛进度
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 12 }}>
            {steps.map((step, i) => {
              const isLast = i === steps.length - 1;
              return (
                <div key={i} style={{ display: 'contents' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step.done
                      ? 'linear-gradient(135deg, #A78BFA, #F0A832)'
                      : step.active
                        ? 'rgba(240, 168, 50, 0.2)'
                        : 'rgba(255, 255, 255, 0.06)',
                    border: step.active ? '2px solid rgba(240, 168, 50, 0.5)' : 'none',
                    fontSize: 11, fontWeight: 700,
                    color: step.done ? '#0F1523' : step.active ? '#F0A832' : 'var(--s-text-3)',
                    flexShrink: 0,
                    boxShadow: step.active ? '0 0 12px rgba(240, 168, 50, 0.3)' : 'none',
                  }}>
                    {step.done ? '✓' : i + 1}
                  </div>
                  {!isLast && (
                    <div style={{
                      flex: 1, height: 2, borderRadius: 2,
                      background: step.done ? 'linear-gradient(90deg, #A78BFA, #F0A832)' : 'rgba(255, 255, 255, 0.06)',
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {steps.map((step, i) => (
              <span key={i} style={{
                fontSize: 10, color: step.done || step.active ? 'var(--s-text-1)' : 'var(--s-text-3)',
                fontWeight: step.active ? 600 : 400,
              }}>
                {step.label}
              </span>
            ))}
          </div>
        </GlassCard>

        {/* Card 5: AI Helper */}
        <GlassCard className="s-card-enter s-card-enter-d5" onClick={() => navigate('aitools')}>
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: '100%', gap: 12, textAlign: 'center',
          }}>
            <div style={{
              fontSize: 36, animation: 's-breathe 3s ease-in-out infinite',
            }}>
              ✦
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--s-text-1)' }}>
              需要帮助？
            </div>
            <div style={{ fontSize: 12, color: 'var(--s-text-3)' }}>
              AI 助手随时为你服务
            </div>
          </div>
        </GlassCard>

        {/* Card 6: Open Competitions — spans 3 cols */}
        <GlassCard span={3} hoverable={false} className="s-card-enter s-card-enter-d6">
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--s-text-3)' }}>
              开放赛事
            </div>
            <button onClick={() => navigate('competitions')} style={{
              padding: '4px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.03)', color: 'var(--s-text-2)',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              查看全部
            </button>
          </div>
          <div style={{
            display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4,
          }}>
            {openComps.slice(0, 6).map((c) => (
              <div key={c.id} onClick={() => navigate('competitions')} style={{
                minWidth: 200, padding: '14px 16px', borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
                flexShrink: 0,
              }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.2)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--s-text-1)', marginBottom: 6 }}>
                  {c.title}
                </div>
                <div style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 20,
                  background: c.status === 'ongoing' ? 'rgba(74, 222, 128, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                  color: c.status === 'ongoing' ? '#4ADE80' : '#A78BFA',
                  fontSize: 10, fontWeight: 600,
                }}>
                  {c.status === 'ongoing' ? '进行中' : '报名中'}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </BentoGrid>
    </div>
  );
}
```

- [ ] **Step 2: Verify dashboard renders**

Login as student. Confirm the Bento Grid dashboard with aurora background, glass cards, score ring, wave progress, and staggered entry animations.

---

### Task 13: Rewrite Login Page

**Files:**
- Rewrite: `frontend-vite/src/pages/login.tsx`

- [ ] **Step 1: Rewrite login.tsx with aurora design**

Replace the entire contents of `frontend-vite/src/pages/login.tsx`:

```tsx
import { useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import { AuroraBg } from '@/components/student-ui/aurora-bg';
import '@/styles/student.css';

export function LoginPage() {
  const { login } = useAuthStore();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemos, setShowDemos] = useState(false);

  const handle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) { setError('请填写用户名和密码'); return; }
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch {
      setError('用户名或密码错误');
      setLoading(false);
    }
  };

  const fill = (u: string, p: string) => { setUsername(u); setPassword(p); };

  return (
    <div className="student-root" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <AuroraBg />
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', zIndex: 1, padding: 24,
      }}>
        {/* Login card */}
        <div style={{
          width: '100%', maxWidth: 400,
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
          border: '1px solid rgba(255, 255, 255, 0.06)',
          borderRadius: 24,
          padding: '40px 36px',
          animation: 's-card-enter 0.6s cubic-bezier(0.16, 1, 0.3, 1) both',
        }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 36, justifyContent: 'center' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #A78BFA, #F0A832)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <svg width="18" height="18" viewBox="0 0 14 14" fill="none">
                <rect x="1" y="7" width="4" height="6" fill="#0F1523" rx="1"/>
                <rect x="5" y="4" width="4" height="9" fill="#0F1523" rx="1"/>
                <rect x="9" y="1" width="4" height="12" fill="#0F1523" rx="1"/>
              </svg>
            </div>
            <span style={{
              fontFamily: 'var(--s-font-body)', fontWeight: 700, fontSize: 15,
              letterSpacing: '0.04em', color: 'var(--s-text-1)',
            }}>
              FORGE
            </span>
          </div>

          {/* Greeting */}
          <div style={{
            fontFamily: 'var(--s-font-hand)', fontSize: 32, fontWeight: 500,
            color: 'var(--s-text-1)', textAlign: 'center', marginBottom: 8,
          }}>
            你好 👋
          </div>
          <p style={{
            fontSize: 14, color: 'var(--s-text-3)', textAlign: 'center', marginBottom: 32,
          }}>
            登录竞赛管理平台
          </p>

          {error && (
            <div style={{
              marginBottom: 20, padding: '10px 14px', borderRadius: 12,
              background: 'rgba(248, 113, 113, 0.1)', border: '1px solid rgba(248, 113, 113, 0.2)',
              fontSize: 13, color: '#F87171',
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handle}>
            <div style={{ marginBottom: 16 }}>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="用户名"
                autoComplete="username"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12, color: 'var(--s-text-1)', fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#A78BFA';
                  e.target.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="密码"
                autoComplete="current-password"
                style={{
                  width: '100%', padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: 12, color: 'var(--s-text-1)', fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.3s, box-shadow 0.3s',
                }}
                onFocus={e => {
                  e.target.style.borderColor = '#A78BFA';
                  e.target.style.boxShadow = '0 0 0 3px rgba(167, 139, 250, 0.1)';
                }}
                onBlur={e => {
                  e.target.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '14px 0',
              background: 'linear-gradient(135deg, #A78BFA, #F0A832)',
              border: 'none', borderRadius: 14,
              color: '#0F1523', fontSize: 15, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'transform 0.15s, opacity 0.15s',
            }}
              onMouseDown={e => { if (!loading) e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {loading ? (
                <svg width={18} height={18} viewBox="0 0 24 24" style={{ animation: 'forge-spin 0.7s linear infinite', display: 'inline-block', verticalAlign: 'middle' }}>
                  <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2.5" opacity={0.3}/>
                  <path d="M12 2a10 10 0 0110 10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              ) : '登录'}
            </button>
          </form>

          {/* Demo accounts */}
          <div style={{ marginTop: 24 }}>
            <button onClick={() => setShowDemos(!showDemos)} style={{
              display: 'flex', alignItems: 'center', gap: 6, margin: '0 auto',
              background: 'none', border: 'none', color: 'var(--s-text-3)',
              fontSize: 12, cursor: 'pointer', padding: '4px 0',
            }}>
              <span style={{ transition: 'transform 0.2s', transform: showDemos ? 'rotate(90deg)' : 'rotate(0deg)', display: 'inline-block' }}>▸</span>
              演示账号
            </button>
            {showDemos && (
              <div style={{
                marginTop: 12, padding: 12, borderRadius: 12,
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                animation: 's-card-enter 0.3s cubic-bezier(0.16, 1, 0.3, 1) both',
              }}>
                <div style={{ fontSize: 10, color: 'var(--s-text-3)', marginBottom: 8, textAlign: 'center' }}>
                  密码均为 password123
                </div>
                {[
                  { role: '管理员', user: 'liuzy', color: '#F0A832' },
                  { role: '教师', user: 'wangjg', color: '#2DD4BF' },
                  { role: '学生', user: 'zhangm', color: '#A78BFA' },
                ].map(({ role, user: u, color }) => (
                  <button key={u} onClick={() => fill(u, 'password123')} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '8px 10px', borderRadius: 8,
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    background: 'transparent', cursor: 'pointer',
                    marginBottom: 4, transition: 'background 0.15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }}/>
                      <span style={{ fontSize: 12, color: 'var(--s-text-2)' }}>{role}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--s-font-mono)', fontSize: 12, color }}>{u}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify login page renders**

Open the app. Confirm the aurora background with centered glass login card, handwritten greeting, and soft input fields. Test login with demo accounts.

---

### Task 14: Self-Review & Verify

- [ ] **Step 1: Test role switching**

Login as admin → FORGE dashboard. Switch to student → Aurora Bento dashboard. Switch to teacher → FORGE dashboard. Confirm each role renders its correct layout.

- [ ] **Step 2: Test student flow**

Login as `zhangm` (student). Navigate: Dashboard → Competitions → Teams → PrePlans → AI Tools → Evaluations. Confirm the student layout (aurora + sidebar) persists across all pages.

- [ ] **Step 3: Check prefers-reduced-motion**

In DevTools, emulate `prefers-reduced-motion: reduce`. Confirm aurora stops animating, card entry is instant.

- [ ] **Step 4: Check responsive behavior**

Resize browser to 1280px width. Confirm Bento Grid still fits 3 columns. Below 1024px, confirm it gracefully collapses.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: implement student portal redesign — Aurora + Bento glassmorphism

- Student-specific components in components/student-ui/
- Aurora animated background, glass cards, Bento Grid
- ScoreRing, WaveProgress, MemberAvatar components
- Student sidebar with purple gradient active states
- StudentLayout wrapper with aurora background
- App.tsx role-based layout switching
- Login page redesigned with aurora for all roles
- Student dashboard rewritten with Bento Grid layout
- CSS foundation in styles/student.css
- Caveat font added for handwritten accents
- prefers-reduced-motion respected

Admin/Teacher portals unchanged."
```
