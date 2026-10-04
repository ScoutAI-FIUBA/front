# Partidos Current Spec

## Product model

- `/partidos` is the primary library in R1.
- A visible Partido is composed in the frontend from a real `Video`, its latest known `ProcessingJob`, and its existing team context.
- The backend `Match` entity is not used because it is not related to videos or processing jobs yet.

## Route and navigation

- Primary route: `/partidos`.
- Primary navigation: Inicio, Partidos, Equipos, Jugadores.
- `/videos`, `/analisis`, and `/revision-manual` remain routable for compatibility but are not primary navigation items.

## Data and states

- The page reuses the analysis job catalog and its bounded team/video/job loading.
- Cards show only the real video title, team, upload date, and one product-facing state composed from the video and latest job.
- The visible states are `Preparando archivo`, `Sin analizar`, `En cola`, `Analizando`, `Reporte listo`, and `Error de análisis`.
- A partial history failure uses the neutral fallback `Estado no disponible` instead of guessing a job state.
- Internal `Video` and `ProcessingJob` states are not exposed as separate concepts in the card.
- The newest job is selected by `createdAt`.
- READY video without jobs: `Analizar`.
- QUEUED or RUNNING: `Ver progreso`.
- DONE: `Ver reporte`.
- FAILED: `Ver problema`.
- A video that is not ready cannot start a new job.
- If job history could not be verified, the page preserves the video but does not offer `Analizar`.

## Navigation reuse

- Upload uses the existing video upload route and returns to `/partidos`.
- New analysis uses `/analisis/nuevo` with the real team and video ids.
- Progress, report, and failure actions use the existing analysis job workspace route.

## Resilience

- Initial loading, total error with retry, empty library, empty filtered result, session expiry, and partial catalog failure are explicit states.
- Active jobs reuse the current catalog polling behavior and its disconnected notice.

## Non-scope

- No backend `/matches` integration.
- No Partido detail screen, backend thumbnails, invented opponent/score/competition, or fabricated progress/statistics.
- No changes to backend contracts, authentication, or analysis result rendering.

## Verification

- Run affected Node tests, the complete test suite, `npm run build`, `npm run lint`, and `git diff --check`.
- Visually verify desktop and mobile with mock services while keeping all displayed records sourced from those service contracts.
