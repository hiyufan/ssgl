# Student Portal Redesign — Design Spec

## Overview

A complete visual redesign of the student-facing portal, replacing the industrial "FORGE" aesthetic with an immersive, premium experience. Admin/Teacher portals remain unchanged.

**Design Direction:** Aurora + Bento — flowing aurora gradients as background, glassmorphism cards in an Apple-style Bento Grid layout.

**Key Constraint:** Same color palette (purple + amber), completely different design language. Must avoid "AI tool" feel — no monospace labels, no angular cards, no "◆ STUDENT PORTAL" tags.

**Scope:** Student portal only. Shared data layer (stores, API, types), replaced visual layer.

---

## Design Principles

1. **Warm, not cold** — Rounded shapes, hand-written accents, warm gradients instead of sharp angles and monospace
2. **Immersive, not utilitarian** — Full-screen aurora backgrounds, glassmorphism depth, cinematic transitions
3. **Structured, not chaotic** — Bento Grid gives order to the visual drama
4. **Alive, not static** — Background drifts, cards breathe, data animates

---

## Color System

### Background

```
Base:      #0A0B14 (deep dark, not pure black)
Aurora-1:  rgba(167, 139, 250, 0.25) — purple glow
Aurora-2:  rgba(240, 168, 50, 0.15) — amber glow
Aurora-3:  rgba(139, 92, 246, 0.12) — deep purple accent
```

### Cards (Glassmorphism)

```
Background:  rgba(255, 255, 255, 0.03)
Backdrop:    blur(24px) saturate(1.4)
Border:      rgba(255, 255, 255, 0.06)
Hover-border: rgba(167, 139, 250, 0.25)
```

### Accent Gradient

```
Primary:   #A78BFA → #F0A832 (purple to amber)
Used for:  buttons, progress bars, highlights, active states
```

### Semantic Colors

```
Success:   #4ADE80
Warning:   #FB923C
Error:     #F87171
Text-1:    #EDF0F9 (primary text)
Text-2:    #8693B0 (secondary text)
Text-3:    #4E5C78 (tertiary/muted)
```

---

## Typography

### Font Stack

```
Display/Body:  'Plus Jakarta Sans' 400/500/600/700
Handwritten:   'Caveat' 400/500 (greetings, labels, playful accents)
Mono (data):   'JetBrains Mono' (scores, statistics only)
```

### Hierarchy

```
Greeting:    Caveat 500, 32px, color: Text-1
H1:          Plus Jakarta Sans 700, 28px, letter-spacing: -0.02em
H2:          Plus Jakarta Sans 600, 20px
Body:        Plus Jakarta Sans 400, 14px
Caption:     Plus Jakarta Sans 500, 12px, color: Text-2
Data:        JetBrains Mono 600, 14px
```

### Key Difference from FORGE

- **No** 'Unbounded' display font (too industrial)
- **No** monospace labels like "◆ STUDENT PORTAL"
- **Yes** Caveat for "加油，张明！" style greetings
- **Yes** JetBrains Mono only for numbers, never for labels

---

## Spacing & Shape

```
Card radius:     20px
Button radius:   14px
Small element:   10px
Card padding:    24px
Grid gap:        16px
Section gap:     28px
```

### Shadows

```
Default:   0 4px 24px rgba(0, 0, 0, 0.2)
Hover:     0 12px 40px rgba(167, 139, 250, 0.12)
           + 0 0 0 1px rgba(167, 139, 250, 0.1)
Active:    0 2px 8px rgba(167, 139, 250, 0.2)
```

---

## Layout System

### Bento Grid (Dashboard)

The student dashboard uses an asymmetric grid inspired by Apple's presentation style. Cards vary in size to create visual rhythm.

```
Grid: 3 columns, auto rows (min 180px)

┌───────────────────────────┬─────────────┐
│                           │             │
│   Greeting Card           │  PrePlan    │
│   (span 2, 1 row)        │  (1×1)      │
│                           │             │
├─────────────┬─────────────┼─────────────┤
│             │             │             │
│  My Team    │  Progress   │  AI Helper  │
│  (1×1)      │  (1×1)      │  (1×1)      │
│             │             │             │
├─────────────┴─────────────┴─────────────┤
│                                         │
│   Open Competitions (span 3, 1 row)     │
│   Horizontal scroll inside              │
│                                         │
└─────────────────────────────────────────┘
```

### Other Pages

- **List pages** (Competitions, Teams): Standard single-column with glass cards
- **Detail pages** (PrePlan detail): Two-column layout (content + sidebar)
- **Form pages** (Evaluation): Centered max-width container (720px)

---

## Components

### Aurora Background

Fixed-position background with 3 animated gradient blobs:

```
3 radial-gradient circles (purple, amber, deep purple)
Each with different animation duration (20-30s)
Slowly drifting via @keyframes translate + rotate
filter: blur(120px) for soft edges
```

### Glass Card

The primary container component:

```
background: rgba(255, 255, 255, 0.03)
backdrop-filter: blur(24px) saturate(1.4)
border: 1px solid rgba(255, 255, 255, 0.06)
border-radius: 20px
padding: 24px

Hover state:
  transform: translateY(-4px) scale(1.01)
  border-color: rgba(167, 139, 250, 0.25)
  box-shadow: 0 20px 60px rgba(167, 139, 250, 0.12)
```

### Score Ring (replaces ScoreGauge)

Circular progress ring for AI scores:

```
SVG circle with stroke-dasharray animation
Gradient stroke: purple → amber
Center: large number in JetBrains Mono
Bottom: label in Plus Jakarta Sans
Animation: fills from 0 to target on mount
```

### Wave Progress Bar

Liquid-style progress bar:

```
Track: rgba(255, 255, 255, 0.06), rounded
Fill: gradient purple → amber
Head: SVG wave animation (path morphing)
Height: 8px
```

### Member Avatar

```
Circle with gradient border on hover
Initials inside
Purple glow: box-shadow on hover
Size: 36px default, 28px compact
```

### Buttons

```
Primary:   gradient background (purple → amber), white text
Secondary: glass background, border: rgba(255,255,255,0.1)
Ghost:     transparent, text: Text-2

All buttons:
  border-radius: 14px
  font-weight: 600
  Click: scale(0.97) bounce
  Hover: subtle glow
```

### Input Fields

```
Background: rgba(255, 255, 255, 0.04)
Border: 1px solid rgba(255, 255, 255, 0.08)
Border-radius: 12px
Focus: border-color purple, subtle glow
No harsh outlines — soft, organic feel
```

### Navigation Sidebar (Student-specific)

```
Background: rgba(255, 255, 255, 0.02)
Backdrop: blur(20px)
Active item: purple gradient left border (not amber)
Logo area: small aurora animation
Simplified nav: no "system management" section
```

---

## Animations & Transitions

### Page Entry

```
Cards enter with staggered animation:
  opacity: 0 → 1
  transform: translateY(30px) → 0, scale(0.96) → 1
  filter: blur(4px) → 0
  Duration: 0.5s, cubic-bezier(0.16, 1, 0.3, 1)
  Stagger: 80ms per card
```

### Aurora Background

```
3 blobs with different speeds:
  Blob 1: 25s infinite alternate
  Blob 2: 30s infinite alternate reverse
  Blob 3: 20s infinite alternate

Each blob:
  @keyframes drift {
    0%   { translate(0, 0) rotate(0deg) }
    50%  { translate(80px, -40px) rotate(180deg) }
    100% { translate(-40px, 60px) rotate(360deg) }
  }
```

### Card Hover

```
transform: translateY(-4px) scale(1.01)
Duration: 0.4s cubic-bezier(0.16, 1, 0.3, 1)
Border color transition: 0.3s
Shadow transition: 0.4s
```

### Score Ring Fill

```
stroke-dashoffset: target → 0
Duration: 1.2s cubic-bezier(0.16, 1, 0.3, 1)
Delay: 0.3s (after card enters)
```

### Wave Progress

```
SVG path morphing:
  Wave peak oscillates via @keyframes
  Duration: 2s ease-in-out infinite
```

### Page Transition

```
Exit: opacity 1→0, translateY(0→-10px), 0.25s
Enter: opacity 0→1, translateY(20px→0), 0.35s
```

### Micro-interactions

```
Button click:    scale(0.97), 0.1s
Input focus:     border expands from center, 0.3s
Star rating:     click triggers scale bounce + color fill
Notification:    slide in from top-right, gradient border
```

---

## Page Designs

### Login Page

**Full-screen immersive experience.** No left/right split.

**Routing:** The login page is shared — show the aurora design to ALL users (not just students). The immersive login is the first impression of the platform; making it beautiful for everyone is worth it. Admin/Teacher users will still see the FORGE dashboard after login.

```
Structure:
  1. Full-screen aurora background (fixed)
  2. Centered glass card (max-width: 400px)
  3. Handwritten greeting: "你好 👋" (Caveat font)
  4. Soft input fields (bottom-line style, not boxed)
  5. Gradient "登录" button
  6. Demo accounts collapsed at bottom
```

**Key differences from FORGE login:**
- No canvas dot-grid animation (too techy)
- No "铸就冠军" headline (too industrial)
- No left/right split layout
- Full-screen aurora with centered card
- Warm greeting instead of marketing copy

### Student Dashboard

**Bento Grid layout with 6 cards:**

1. **Greeting Card** (span 2): Handwritten name, team info, mini progress ring
2. **PrePlan Card**: AI score ring, status badge, click to navigate
3. **My Team Card**: Member avatars, team name, competition
4. **Progress Card**: 5-step liquid progress bar
5. **AI Helper Card**: Breathing icon, "需要帮助？" prompt
6. **Open Competitions** (span 3): Horizontal scroll of competition mini-cards

### Competitions Page

Glass cards in a responsive grid (2 columns). Each card has:
- Gradient color header bar
- Competition title + status badge
- Key info: team size, deadline, prize
- Hover: card lifts, border glows

### Teams Page

Two-column layout:
- Left: Team info card with members
- Right: Competition details + actions

### PrePlans Page

- List view: Glass cards with status indicators
- Detail view: Full content + AI review results in a highlighted glass card
- Submit form: Centered, large glass card with soft inputs

### AI Tools Page

Bento Grid of 6 tool cards, each with:
- Unique gradient accent color
- Tool icon + name
- Brief description
- Click opens tool in a modal or dedicated section

### Evaluations Page

- Star rating with gradient fill + click bounce animation
- Glass card form
- Success state with confetti-like particle effect

---

## Technical Implementation

### File Structure

```
frontend-vite/src/
├── components/
│   ├── ui/                    # Existing FORGE components (unchanged)
│   └── student-ui/            # NEW: Student-specific components
│       ├── aurora-bg.tsx      # Aurora background
│       ├── glass-card.tsx     # Glassmorphism card
│       ├── bento-grid.tsx     # Bento layout container
│       ├── score-ring.tsx     # Circular score display
│       ├── wave-progress.tsx  # Liquid progress bar
│       ├── member-avatar.tsx  # Team member avatar
│       ├── student-layout.tsx # Student-specific layout wrapper
│       └── student-sidebar.tsx # Student-specific sidebar
├── pages/
│   ├── login.tsx              # Rewrite with aurora design (all roles)
│   ├── dashboard/
│   │   └── student.tsx        # Rewrite with Bento Grid
│   └── ...                    # Other pages upgraded incrementally
├── styles/
│   ├── index.css              # Existing FORGE styles (unchanged)
│   └── student.css            # NEW: Student-specific styles
└── App.tsx                    # Modified: role-based layout switching
```

### Implementation Phases

**Phase 1: Foundation**
- Create `student.css` with CSS variables, animations, aurora keyframes
- Build `aurora-bg.tsx` component
- Build `glass-card.tsx` component
- Build `bento-grid.tsx` component
- Load 'Caveat' font from Google Fonts

**Phase 2: Dashboard**
- Rewrite `student.tsx` with Bento Grid layout
- Build `score-ring.tsx` (replaces ScoreGauge for students)
- Build `wave-progress.tsx`
- Build `member-avatar.tsx`
- Integrate all components

**Phase 3: Login Page**
- Rewrite `login.tsx` with aurora design (shared by all roles)
- Full-screen aurora + centered glass card
- Handwritten greeting

**Phase 4: Other Pages**
- Upgrade competitions, teams, preplans, evaluations, AI tools pages
- Apply glass card + aurora background consistently
- Maintain FORGE style for Admin/Teacher pages

### Integration Strategy

```
App.tsx role check:
  if (role === 'student') {
    return <StudentLayout>{children}</StudentLayout>
  } else {
    return <DashboardLayout>{children}</DashboardLayout>
  }
```

- Shared: stores (auth, app), API services, types
- Separate: layout, components, styles, animations
- No changes to Admin/Teacher code

### Browser Compatibility

```
backdrop-filter:  Chrome 76+, Safari 14+, Firefox 103+
CSS Grid:         All modern browsers
CSS animations:   All modern browsers
@keyframes:       All modern browsers
```

### Performance Considerations

```
- Aurora background: 3 animated blobs with filter: blur — test on low-end devices
- Fallback: static gradient if prefers-reduced-motion
- Glass cards: backdrop-filter can be expensive — limit to visible cards
- Animations: use transform/opacity only (GPU-accelerated)
- Font loading: Caveat loaded via Google Fonts with font-display: swap
```

---

## Accessibility

```
- prefers-reduced-motion: disable aurora animation, simplify transitions
- Color contrast: Text-1 (#EDF0F9) on dark bg (#0A0B14) = ratio 15.8:1 ✓
- Focus states: visible purple outline on keyboard focus
- Screen reader: proper ARIA labels on all interactive elements
```

---

## Success Criteria

1. Student portal visually distinct from Admin/Teacher — users can tell immediately
2. Aurora background renders smoothly at 60fps on mid-range devices
3. Glass cards have visible blur effect on all modern browsers
4. Bento Grid layout is responsive (works on 1280px+ screens)
5. All animations respect prefers-reduced-motion
6. Admin/Teacher portals completely unchanged
7. Login page feels immersive and premium, not like a tech tool (all roles see aurora login)
