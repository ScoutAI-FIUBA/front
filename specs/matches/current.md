# Partidos Current Spec

## Product model

- `/partidos` is the primary library in R1.
- A visible Partido is composed in the frontend from a real `Video`, its latest known `ProcessingJob`, and its existing team context.
- The backend `Match` entity is not used because it is not related to videos or processing jobs yet.

## Route and navigation

- Primary route: `/partidos`.
- Canonical detail route: `/partidos/:videoId`.
- Detail tabs are refresh-safe query states: `?tab=video`, `?tab=reporte`, and `?tab=clips`; an absent or invalid value falls back to Video.
- The completed Reporte has refresh-safe subsections in the same URL: `?tab=reporte&seccion=resumen`, `tiros`, `movimiento`, or `similares`. An absent or invalid `seccion` falls back to `resumen`, and subsection links use normal browser history.
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
- Library CTAs enter the Partido detail first. Analysis-related states open its Reporte tab.

## Partido detail

- The header shows only the real video title, team, upload date, and composed Partido state.
- When `tab=reporte` is active, the Partido header uses a compact desktop variant: it preserves the title, team, upload date, composed state, and Video / Reporte / Clips navigation while reducing vertical spacing and keeping the title on one line when space allows. The Video tab keeps the existing large hero header.
- Video reuses the existing signed-playback player and renewal behavior with reduced chrome.
- Reporte keeps its compact Partido header and editorial report space before results exist. A ready video without a job explains that no report exists yet, previews only the four future sections by name and purpose, and exposes one primary `Analizar partido` action through the existing new-analysis route without fake result data.
- QUEUED and RUNNING remain inside Partido and reuse the existing team-scoped polling loop. QUEUED states that the party is in the real queue; RUNNING states that analysis is in progress. A real `progressPercent` is rendered only when non-null, and elapsed time is shown only from a valid real `startedAt`. Neither state invents stages, ETA, frames, or intermediate findings, and neither routes the user to the legacy job workspace.
- Polling replaces the latest job snapshot in place. A transition from QUEUED or RUNNING to DONE reveals the completed Reporte in the same Partido route without automatic external navigation.
- FAILED uses the product statement `No se pudo analizar este partido`. The primary recovery action opens the existing new-analysis flow for the same team and video; the exact legacy job detail remains a secondary technical-support action. Raw backend errors are not promoted as user-facing reasons because the current contract does not mark them as safe copy.
- A completed Reporte embeds the real result workspace for the latest job directly inside the Partido detail. It does not render a second Partido header or a second source player and does not require an `Abrir reporte completo` gateway.
- The completed Reporte index is `01 Resumen`, `02 Tiros`, `03 Movimiento`, and `04 Similares`. It reuses the same result surfaces and exact-job Similar links as the legacy job route.
- The embedded workspace owns one shared Stats/Shot Chart controller after team-side confirmation. Resumen and Tiros consume the same loaded result; Resumen does not mount a hidden Tiros screen to obtain shooting data.
- The completed Reporte uses a match-specific editorial presentation for its typographic `01 Resumen` through `04 Similares` index, team-side decision, Resumen, and Tiros while leaving the legacy job workspace presentation available at `/analisis/jobs/:jobId`.
- Before team-side confirmation, Resumen presents the real detected sides as `Lado 0` and `Lado 1`, including only backend-provided track counts, jersey numbers, roster matches, and the explicitly non-definitive suggestion. Persistence continues through the existing team-side endpoint.
- After confirmation, Resumen builds its editorial field-goal statement only from the loaded team shooting totals and renders the shared real Shot Chart as the primary visual. Coverage remains secondary text and section access uses flat rows.
- Tiros keeps local result, value, player, and zone filtering plus bidirectional marker/list selection. Result semantics are visually independent from the orange selection accent, and the selected-shot rail renders only real conditional fields.
- Movimiento and Similares use the same flat editorial Reporte presentation without changing their existing behavior: Movimiento keeps one player-or-group filter, exclusive trajectory/heatmap views, real spatial metrics, sample-sequence playback, and no video synchronization; Similares keeps backend ordering, scores, metadata hydration, and exact legacy job navigation in divided editorial rows.
- Source video in the match Reporte is evidence on demand: it stays mounted once, remains visually secondary until `Ver jugada` is used for a shot with `timestampSeconds`, and preserves the existing direct seek, play, signed-URL renewal, and no-offset behavior.
- Team-side confirmation remains persisted by the existing endpoint and updates the embedded latest-job snapshot. No frontend mapping is added between track-based team-side evidence and v2 `stable_player_id` jersey identity.
- Clips loads real `ClipCollection` records for the video and their persisted items only when the tab is opened.
- Clip rows use a persisted backend `description` as their title when present. Legacy items without one keep the honest fallback `Clip N · mm:ss–mm:ss`; notes and player associations are not reconstructed.
- The Video tab uses `presigned_thumbnail_url` from `GET /videos/{id}?team_id=...` as the native video poster when present and keeps the existing no-poster fallback when absent.
- `GET /videos?team_id=...` does not expose the thumbnail, so the Partidos library progressively requests each visible catalog video's existing detail endpoint after the base catalog renders. A global pool limits detail requests to four at a time, an in-memory cache refreshes signed URLs before their 3600-second expiry, and null or failed posters keep the schematic court without affecting the catalog.
- Existing collection and manual clip routes remain the editing workflow and remain routable.

## Navigation reuse

- Upload uses the existing video upload route and returns to `/partidos`.
- New analysis uses `/analisis/nuevo` with the real team and video ids.
- Active report progress remains inline in Partido. A failed job may open its exact legacy `/analisis/jobs/:jobId?team_id=...` route only as a secondary technical-detail action, while recovery reuses `/analisis/nuevo` with the same team and video. A completed job is reviewed inline in Partido; Similar results continue opening their exact legacy job route.

## Resilience

- Initial loading, total error with retry, empty library, empty filtered result, session expiry, and partial catalog failure are explicit states.
- Active jobs reuse the current catalog polling behavior and its disconnected notice.

## Non-scope

- No backend `/matches` integration.
- No invented opponent/score/competition, fabricated progress/statistics, analysis stages, ETA, or processed-frame counts. R3-C changes only the desktop no-job, QUEUED, RUNNING, and FAILED Partido Reporte states; completed Reporte, mobile, backend contracts, Auth, Clips, and upload remain unchanged.
- No changes to backend contracts, authentication, or analysis result rendering.

## Verification

- Run affected Node tests, the complete test suite, `npm run build`, `npm run lint`, and `git diff --check`.
- Visually verify desktop and mobile with mock services while keeping all displayed records sourced from those service contracts.
