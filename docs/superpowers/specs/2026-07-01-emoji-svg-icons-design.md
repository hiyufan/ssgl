# Emoji To SVG Icons Design

## Goal

Replace user-visible emoji in the main Vite React app with SVG icons while keeping the current product tone and layout intact.

## Scope

- In scope: `frontend-vite/src`.
- Out of scope: legacy `frontend/`, backend, AI service, generated docs, and static flowchart images.

## Approach

Use the existing shared `Icon` component as the single SVG icon layer. Extend it with semantic icon names needed by the affected pages, then replace emoji string literals in pages and shared UI components with those semantic names.

Where a shared component already accepts an `icon` prop, callers will pass names like `trophy`, `users`, `chart`, or `alert` instead of emoji characters. Where emoji are embedded directly in headings or buttons, render an `Icon` next to plain text instead.

## Components

- `frontend-vite/src/components/ui/icon.tsx`: central SVG registry and fallback behavior.
- `frontend-vite/src/components/ui/page-helpers.tsx`: optional icon support for page headers and section labels.
- Feature pages under `frontend-vite/src/pages`: replace direct emoji text with icon components or semantic icon names.

## Testing

- Add unit coverage for the shared `Icon` component so known icon names render SVG and unknown names fall back safely.
- Run the frontend build to catch TypeScript and JSX regressions.
- Run a final source scan to confirm no emoji remain in `frontend-vite/src`.
