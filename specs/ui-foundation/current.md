# UI Foundation Current Spec

## Status

Implemented Phase 6A foundation.

## Area

Application shell, responsive navigation, and shared visual primitives.

## Current Behavior

- Authenticated routes render inside a persistent desktop sidebar and top header.
- On narrow screens, navigation opens as an overlay drawer instead of consuming permanent page width.
- The drawer closes after selecting a destination and can also be dismissed from its close button or backdrop.
- The shell keeps page content within a readable maximum width while allowing data-heavy screens to use the available space.
- The navigation footer exposes the authenticated user and logout action.
- Shared cards, inputs, selects, buttons, and dialogs use consistent radius, surface, focus, and shadow treatments.
- Feature pages retain their existing workflows and service boundaries.

## Goal

Provide a neutral, task-oriented visual foundation that can support ongoing backend integration and a future scoped dark analysis workspace without prematurely redesigning existing feature flows.

## Scope

- Responsive desktop/mobile application shell.
- Mobile navigation drawer and backdrop.
- Task-oriented navigation groups and labels without changing routes.
- Global `Empezar análisis` action and removal of the nonfunctional global search.
- A single CSS-variable token source for neutral surfaces, brand actions, and semantic states.
- Existing/system typography using `Segoe UI Variable`, `system-ui`, and `sans-serif`.
- Shared visual treatments for buttons, cards, inputs, selects, dialogs, and badges.
- Shared `PageHeader`, `EmptyState`, and `StatusIndicator` components.
- Mobile/tablet/desktop page padding of 16/24/32 pixels.
- A normal content width around 1280 pixels while preserving the existing wide canvas for untouched data-heavy pages and the analysis workspace.

## Non-Scope

- Analysis workspace redesign.
- New charts, imagery, or dependencies.
- Backend, API, mock, or domain behavior changes.
- Implementing search, configuration, or help features.
- Applying the new page composition to Equipos, Jugadores, Videos, Partidos, Analysis Setup, Analysis Review, or Workspace.
- Scoped workspace-theme activation; workspace tokens can be introduced when the workspace is redesigned.

## Routes

- Applies to every protected route rendered through `AppShell`.

## Files Involved

- `src/components/layout/AppShell.tsx`
- `src/components/ui/page-header.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/status-indicator.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/badge.tsx`
- `src/index.css`
- `tailwind.config.js`

## Services And Data

- Uses existing `AuthContext` user and logout behavior.
- No service contracts or persistence behavior change.

## Acceptance Criteria

- Protected pages do not horizontally overflow because of the sidebar at a 390px viewport.
- Desktop navigation remains persistently visible at the `lg` breakpoint.
- Mobile navigation is accessible from the header and does not reduce content width.
- Active navigation remains visually identifiable.
- Logout remains available on desktop and mobile.
- Visible navigation uses Inicio, Análisis, Partidos, Videos, Equipos, and Jugadores grouped by user task.
- Creation and detail routes keep their parent navigation item active.
- The shell has no nonfunctional search control.
- The global creation action reads `Empezar análisis` and routes to `/analisis/nuevo`.
- Tailwind color utilities use CSS-variable tokens rather than independent hardcoded brand values.
- Compatibility aliases keep untouched pages functional and visually coherent during the phased migration.
- Shared form controls remain clearly interactive and do not resemble disabled/error fields by default.
- Existing feature routes and actions continue working.

## Verification

- Run `npm run lint`.
- Run `npm run build`.
- Visually inspect `/dashboard` and `/analisis/nuevo` at desktop and 390px widths.
- Verify opening, navigating with, and dismissing the mobile drawer.

## Risks Or Notes

- The token migration intentionally changes the brand action color, but compatibility aliases minimize regressions in untouched pages.
- Feature-specific layouts may still need later responsive refinements.
- The wide outer canvas remains available so this phase does not indirectly redesign the analysis workspace or data-heavy pages.
