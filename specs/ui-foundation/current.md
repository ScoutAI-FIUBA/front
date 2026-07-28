# UI Foundation Current Spec

## Status

Implemented foundation for the in-progress ScoutAI frontend.

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

Provide a responsive, polished base that can support ongoing backend integration without prematurely redesigning unstable product flows.

## Scope

- Responsive desktop/mobile application shell.
- Mobile navigation drawer and backdrop.
- Improved brand block, active navigation, page container, and user footer.
- Shared visual treatments for core UI primitives.
- Background, typography fallback, focus, and selection polish.

## Non-Scope

- Dashboard information architecture redesign.
- Analysis workspace redesign.
- New charts, imagery, or dependencies.
- Backend, API, mock, or domain behavior changes.
- Implementing search, configuration, or help features.

## Routes

- Applies to every protected route rendered through `AppShell`.

## Files Involved

- `src/components/layout/AppShell.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/select.tsx`
- `src/index.css`

## Services And Data

- Uses existing `AuthContext` user and logout behavior.
- No service contracts or persistence behavior change.

## Acceptance Criteria

- Protected pages do not horizontally overflow because of the sidebar at a 390px viewport.
- Desktop navigation remains persistently visible at the `lg` breakpoint.
- Mobile navigation is accessible from the header and does not reduce content width.
- Active navigation remains visually identifiable.
- Logout remains available on desktop and mobile.
- Shared form controls no longer resemble disabled/error fields by default.
- Existing feature routes and actions continue working.

## Verification

- Run `npm run lint`.
- Run `npm run build`.
- Visually inspect `/dashboard` and `/analisis/nuevo` at desktop and 390px widths.
- Verify opening, navigating with, and dismissing the mobile drawer.

## Risks Or Notes

- Feature-specific layouts may still need later responsive refinements.
- This phase intentionally preserves the existing burgundy identity and page-level designs.
