# Inicio Current Spec

## Product role

- `/` is the canonical protected Inicio surface. `/dashboard` remains a compatibility alias that redirects to `/`.
- Inicio is a continuation point, not a metrics dashboard. Its reading order is `Seguí donde quedaste`, one priority Video, up to three recent Videos, and one primary `Subir video` action.
- It reuses the shared analysis catalogue and the composed `MatchLibraryItem` compatibility model used by `/videos`; it presents Video without exposing ProcessingJob as a separate product entity.

## Priority Video

- Exactly one Video may be promoted.
- Active priority is: newest RUNNING, newest QUEUED, then newest file preparation.
- When nothing is active, FAILED analysis, failed material, DONE, and READY-without-analysis compete by their latest real lifecycle timestamp. An old failure cannot outrank a newer completed analysis or newer ready Video merely because it failed.
- `Estado no disponible` is used only when no better verifiable candidate exists.
- RUNNING/QUEUED use job timestamps, terminal jobs prefer `finishedAt` and fall back to `updatedAt`/`createdAt`, and material-only states use the upload timestamp.
- The priority destination is the Video Análisis IA at `/videos/:videoId?tab=reporte`.
- Contextual actions are `Ver progreso`, `Ver análisis`, `Resolver problema`, and `Analizar video`; file preparation may continue to the same analysis state without invented progress.
- The hero shows only real title, team, upload date, composed product state, optional poster, and a real RUNNING percentage when non-null. Technical ids, pipeline details, and raw errors are absent.

## Recent Videos

- At most three unique videos are shown after excluding the promoted Video.
- Each row uses title, team, upload date, composed product state, poster or court fallback, and links to `/videos/:videoId`.
- `Ver todos` opens `/videos`. The full Videos card grid is not duplicated.

## Data and posters

- `useAnalysisJobCatalog()` keeps its bounded catalogue load, 60-second cache, active-job polling, session handling, and partial-failure behavior.
- `buildMatchLibrary()` provides the latest job and the same product-facing states as Videos.
- Inicio reuses the shared `match-posters.ts` cache, concurrency pool, signed thumbnail loading, and court fallback for the promoted Video plus recent rows only.
- The court fallback keeps its own measurable layout while a poster is pending, resolves without a URL, or fails, so the hero never becomes an empty black half.

## States

- Initial loading preserves the hero and recent-row structure without fake results.
- Total errors keep the Inicio heading and `Subir video` action visible and offer inline retry.
- Partial failures preserve real data and use `Estado no disponible` where a job history could not be verified.
- Empty catalogue copy is `Tu primer video empieza acá` with a single `Subir video` action.
- Polling failures preserve cached content and reuse the existing scoped notice.

## Navigation

- The primary and empty-state CTA is `/videos/subir`.
- Inicio contains no primary links to `/partidos`, `/analisis`, or `/analisis/nuevo`.
- The shell Inicio link and ScoutAI logo point to `/`.
- Direct login and registration finish at `/`; preserved internal deep links still return to their exact destination. Unauthenticated `/` visits pass through `ProtectedRoute` to `/login` and return to `/` without a redirect loop.

## Non-scope

- No backend, Reporte, Nuevo partido, Clips, Equipos/Jugadores, Auth visual, or mobile redesign changes.
- No KPIs, charts, synthetic recent activity, invented progress, or report-read state.

## Verification

- Cover priority ordering, terminal recency, deduplication, three-item limit, canonical routes, auth return paths, empty/error/partial source states, and legacy `/dashboard` compatibility.
- Run focused tests, the complete suite, build, lint, and `git diff --check`.
