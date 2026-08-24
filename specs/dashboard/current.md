# Inicio Current Spec

## Status

Implemented Phase 6B Inicio redesign.

## Area

Protected `/dashboard` route, presented to users as Inicio.

## Current Behavior

- The existing dashboard renders KPI cards, quick creation cards, recent mock activity, a synthetic system-health notice, and a player table with fabricated ratings.
- Dashboard statistics and recent activity come from the mock analysis service.
- The page does not distinguish loading, successful-empty, and service-error states.

## Goal

Replace the KPI dashboard with a state-aware task entry point that only presents analysis work backed by trustworthy data available in the current frontend.

## Scope

- Present `/dashboard` as Inicio.
- Load existing analysis sessions and resolve their details through the current analysis service.
- Treat only details containing `manualAnalysis` as usable recent work on Inicio.
- Keep loading, successful-empty, successful-with-work, and error states distinct.
- Highlight at most one latest saved analysis and present up to three older items as lightweight rows.
- Link review actions to the existing `/analisis/:id` route.
- Provide a contextual `Empezar análisis` action in the successful-empty state.

## Non-Scope

- Changes to analysis seeds, service contracts, service implementations, types, or `/analisis` behavior.
- Durable draft or resume support.
- Displaying synthetic progress, frame counts, ratings, AI results, activity, or system health.
- Redesigning the analysis list, setup, workspace, or review pages.

## Routes

- `/dashboard`: Inicio.
- `/analisis/nuevo`: destination for `Empezar análisis`.
- `/analisis/:id`: destination for reviewing saved manual analysis work.
- `/analisis`: destination used when more saved work exists than Inicio displays.

## Files Involved

- `src/pages/dashboard/DashboardPage.tsx`
- `src/components/ui/page-header.tsx`
- `src/components/ui/empty-state.tsx`
- `src/components/ui/status-indicator.tsx`
- `src/services/contracts/analysis.service.ts` (consumed without modification)
- `src/services/mock/analysis.mock.ts` (consumed without modification)

## Services And Data

- `analysisService.listSessions()` supplies candidate session ids.
- `analysisService.getBySessionId()` resolves detail records.
- A detail is usable on Inicio only when `manualAnalysis` exists.
- The local view model uses `manualAnalysis.name`, `manualAnalysis.savedAt`, `manualAnalysis.clips.length`, and the related video title.
- Synthetic seed sessions remain available everywhere else and are filtered only in the Inicio presentation layer.

## Acceptance Criteria

- Loading is presented independently and cannot display the empty-state message.
- A service failure presents an explicit error with a retry action and cannot display the empty state.
- A successful response with no usable manual analysis displays `Empezá tu primer análisis` and one contextual primary action.
- A successful response with usable work displays the latest item as `Listo para revisar`.
- The highlighted item exposes only its meaningful title, real saved date, real clip count, video title, and review action.
- Up to three older usable items appear below as lightweight rows.
- `Ver todos los análisis` appears only when additional usable items are hidden.
- No KPI cards, system-health message, fabricated rating, processing progress, frame count, SCAN id, or fake activity appears.
- The mobile layout keeps the primary task first and uses no horizontal table.

## Verification

- Run `npm run lint`.
- Run `npm run build`.
- Inspect successful-empty and successful-with-work states at desktop width.
- Inspect Inicio and the mobile navigation at approximately 390px.
- Verify that a forced service failure renders error rather than empty state where practical.

## Risks Or Notes

- Analysis remains mock-backed in the current service registry even when other domains use the backend.
- Resolving detail records creates parallel mock calls because no recent-analysis summary endpoint exists.
- Manual analysis metadata is session-scoped in the current frontend and is not equivalent to a durable draft.
- The existing analysis list can show seed sessions while Inicio intentionally excludes them.
