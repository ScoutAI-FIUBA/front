# Inicio Current Spec

## Status

ScoutAI v2 Phase 2 automatic-analysis home.

## Route

- `/dashboard`: protected Inicio surface.

## Current Behavior

- Desktop relies on the persistent sidebar for the global `Nuevo análisis` action; the page-level action remains visible below the desktop breakpoint and empty states keep their contextual actions.
- The desktop reading order is deliberately vertical: active work first, recent completed results second, and recent source material third. Typography, spacing, and dividers establish priority without KPI cards.

- Inicio answers “what is happening and what do I do next?” with real automatic-analysis activity.
- The page consumes the shared ProcessingJob catalogue used by Analysis and Videos; it does not read mock `AnalysisSession` records.
- Active jobs appear first with backend status and real progress only when `progress_percent` exists.
- Recently completed jobs use the source video title and team as their human identity and link directly to the result workspace.
- Recent videos stay secondary. Their primary action follows the latest known ProcessingJob using the same labels and workspace URLs as Videos; only material without a known job offers `Analizar`. The team-scoped Videos context remains available.
- The primary CTA is `Nuevo análisis` and targets `/analisis/nuevo`.
- No decorative KPIs, synthetic insights, manual-session codes, fake health states, or fabricated progress are shown.

## States

- Initial loading uses layout-preserving skeletons.
- Cached catalogue content remains visible while active jobs refresh.
- Partial team/video/job failures preserve usable content and show a scoped warning.
- A real network failure with no cached catalogue shows retry.
- Authentication failure invalidates the shared token and ProtectedRoute returns to Login.
- A new user with no videos sees `Subí tu primer video`.
- A user with videos but no jobs sees a ready-to-analyse state instead of a false first-use state.

## Data And Performance

- Data comes from the frontend Phase 2 catalogue composition: teams → videos by team → jobs by video.
- The catalogue uses bounded concurrency, a 60-second in-memory cache, partial results, and polling only for `QUEUED` or `RUNNING` jobs.
- A dedicated authenticated global-jobs backend endpoint remains the long-term solution.

## Files

- `src/pages/dashboard/DashboardPage.tsx`
- `src/pages/analysis/use-analysis-job-catalog.ts`
- `src/pages/analysis/analysis-job-catalog-store.ts`
- `src/pages/analysis/analysis-job-catalog.ts`
- `src/components/layout/AppShell.tsx`

## Verification

- Focused Phase 2/2.1 tests and the full 170-test frontend suite pass.
- `npm run build` passes with the known Vite chunk-size warning.
- `npm run lint` reports 0 errors and the two pre-existing Fast Refresh warnings.
- Phase 2.1 visual QA covers the prioritised activity state at 1440 × 900 and 390 × 844.
