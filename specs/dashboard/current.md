# Inicio Current Spec

## Product role

- `/` is the canonical protected Inicio surface. `/dashboard` remains a compatibility alias that redirects to `/`.
- Inicio is a continuation point, not a metrics dashboard. Its reading order is `Seguí donde quedaste`, one priority Partido, up to three recent Partidos, and one primary `Nuevo partido` action.
- It reuses the shared analysis catalogue and the composed `MatchLibraryItem` model already used by `/partidos`; it does not present Video or ProcessingJob as product entities.

## Priority Partido

- Exactly one Partido may be promoted.
- Active priority is: newest RUNNING, newest QUEUED, then newest file preparation.
- When nothing is active, FAILED analysis, failed material, DONE, and READY-without-analysis compete by their latest real lifecycle timestamp. An old failure cannot outrank a newer completed report or newer ready Partido merely because it failed.
- `Estado no disponible` is used only when no better verifiable candidate exists.
- RUNNING/QUEUED use job timestamps, terminal jobs prefer `finishedAt` and fall back to `updatedAt`/`createdAt`, and material-only states use the upload timestamp.
- The priority destination is the Partido Reporte at `/partidos/:videoId?tab=reporte`.
- Contextual actions are `Ver progreso`, `Ver reporte`, `Resolver problema`, and `Analizar partido`; file preparation may continue to the same Reporte state without invented progress.
- The hero shows only real title, team, upload date, composed product state, optional poster, and a real RUNNING percentage when non-null. Technical ids, pipeline details, and raw errors are absent.

## Recent Partidos

- At most three unique videos are shown after excluding the promoted Partido.
- Each row uses title, team, upload date, composed product state, poster or court fallback, and links to `/partidos/:videoId`.
- `Ver todos` opens `/partidos`. The full Partidos card grid is not duplicated.

## Data and posters

- `useAnalysisJobCatalog()` keeps its bounded catalogue load, 60-second cache, active-job polling, session handling, and partial-failure behavior.
- `buildMatchLibrary()` provides the latest job and the same product-facing states as Partidos.
- Inicio reuses the shared `match-posters.ts` cache, concurrency pool, signed thumbnail loading, and court fallback for the promoted Partido plus recent rows only.
- The court fallback keeps its own measurable layout while a poster is pending, resolves without a URL, or fails, so the hero never becomes an empty black half.

## States

- Initial loading preserves the hero and recent-row structure without fake results.
- Total errors keep the Inicio heading and `Nuevo partido` action visible and offer inline retry.
- Partial failures preserve real data and use `Estado no disponible` where a job history could not be verified.
- Empty catalogue copy is `Tu primer partido empieza acá` with a single `Nuevo partido` action.
- Polling failures preserve cached content and reuse the existing scoped notice.

## Navigation

- The primary and empty-state CTA is `/partidos/nuevo`.
- Inicio contains no primary links to `/videos`, `/videos/subir`, `/analisis`, or `/analisis/nuevo`.
- The shell Inicio link and ScoutAI logo point to `/`.
- Direct login and registration finish at `/`; preserved internal deep links still return to their exact destination. Unauthenticated `/` visits pass through `ProtectedRoute` to `/login` and return to `/` without a redirect loop.

## Non-scope

- No backend, Reporte, Nuevo partido, Clips, Equipos/Jugadores, Auth visual, or mobile redesign changes.
- No KPIs, charts, synthetic recent activity, invented progress, or report-read state.

## Verification

- Cover priority ordering, terminal recency, deduplication, three-item limit, canonical routes, auth return paths, empty/error/partial source states, and legacy `/dashboard` compatibility.
- Run focused tests, the complete suite, build, lint, and `git diff --check`.
