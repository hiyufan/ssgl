# Emoji SVG Icons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all emoji in `frontend-vite/src` with SVG icons or plain text.

**Architecture:** Expand the existing `Icon` component into the shared SVG source of truth, add icon-capable helpers for headings/labels, and update page call sites to use semantic icon names or inline `Icon` components.

**Tech Stack:** React 19, TypeScript, Vite, lucide-react, existing CSS variables.

---

### Task 1: Icon Registry Test

**Files:**
- Create: `frontend-vite/src/components/ui/icon.test.tsx`
- Modify: `frontend-vite/package.json`

- [ ] Add a test script using Node's built-in test runner and `tsx` so component tests can run without adding a browser test framework.
- [ ] Write a failing test that renders `Icon` to static markup and asserts known names produce SVG.
- [ ] Write a failing test that an unknown name renders the fallback SVG instead of text.
- [ ] Run `npm test -- --runInBand` from `frontend-vite` and confirm the tests fail before implementation.

### Task 2: Shared SVG Icon Layer

**Files:**
- Modify: `frontend-vite/src/components/ui/icon.tsx`
- Modify: `frontend-vite/src/components/ui/page-helpers.tsx`
- Modify: `frontend-vite/src/components/ui/badge.tsx`

- [ ] Replace the hand-written icon registry with lucide-backed SVG components and semantic aliases for existing and new names.
- [ ] Keep `Icon` props stable: `name` and optional `size`.
- [ ] Add optional `icon` props to `PageHeader` and `SectionLabel`.
- [ ] Replace difficulty badge star text with SVG stars.
- [ ] Run the icon tests and confirm they pass.

### Task 3: Page Emoji Replacement

**Files:**
- Modify all matching files under `frontend-vite/src/pages`.

- [ ] Replace `icon` data fields that contain emoji with semantic icon names.
- [ ] Replace heading/button/status emoji prefixes with `Icon` components or plain text where an icon is not appropriate.
- [ ] Replace rank medal emoji with SVG award/trophy/star indicators.
- [ ] Replace status text emoji in state values with separate icon rendering or plain text.
- [ ] Run `rg -n -P "[\\x{1F000}-\\x{1FAFF}\\x{2600}-\\x{27BF}]" frontend-vite/src` and confirm no matches remain.

### Task 4: Verification

**Files:**
- No new files.

- [ ] Run `npm test` from `frontend-vite`.
- [ ] Run `npm run build` from `frontend-vite`.
- [ ] Review `git diff --check`.
- [ ] Report any residual limitations or verification failures.
