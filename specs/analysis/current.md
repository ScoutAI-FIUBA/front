# Analysis Current Spec

El estado operativo del working tree y el próximo punto de continuación están registrados en [`handoff.md`](./handoff.md).

## Status

Implemented behavior through the ScoutAI v2 Phase 2 automatic-analysis discovery flow, preserving the Phase 1.1 result workspace.

## Routes

- `/analisis`: global real ProcessingJob catalogue composed from teams, videos, and per-video jobs.
- `/analisis/nuevo`: automatic-analysis entry flow: choose a ready video or upload one, then create its ProcessingJob.
- `/revision-manual`: secondary legacy/manual analysis list.
- `/revision-manual/nuevo`: manual clipping playground preserved for compatibility.
- `/analisis/:id`: analysis detail page.
- `/analisis/jobs/:jobId?team_id=...`: real processing-job detail.

## Files Involved

- `src/pages/analysis/AnalysisPage.tsx`
- `src/pages/analysis/AnalysisNewPage.tsx`
- `src/pages/analysis/AnalysisSetup.tsx`
- `src/pages/analysis/AnalysisWorkspace.tsx`
- `src/pages/analysis/ClipTimeline.tsx`
- `src/pages/analysis/AnalysisDetailPage.tsx`
- `src/pages/analysis/AnalysisJobDetailPage.tsx`
- `src/pages/analysis/AnalysisJobResultsWorkspace.tsx`
- `src/pages/analysis/use-analysis-job-shooting-data.ts`
- `src/pages/analysis/analysis-job-detail.ts`
- `src/pages/analysis/AnalysisJobTeamSide.tsx`
- `src/pages/analysis/analysis-job-team-side.ts`
- `src/pages/analysis/AnalysisJobShootingStats.tsx`
- `src/pages/analysis/analysis-job-stats.ts`
- `src/pages/analysis/AnalysisJobShotChart.tsx`
- `src/pages/analysis/analysis-job-shot-chart.ts`
- `src/pages/analysis/AnalysisJobCourtPositions.tsx`
- `src/pages/analysis/analysis-job-court-positions.ts`
- `src/pages/analysis/AnalysisJobSimilarAnalyses.tsx`
- `src/pages/analysis/analysis-job-similar.ts`
- `src/components/analysis/ShotChartCourt.tsx`
- `src/components/analysis/shot-chart-court.ts`
- `src/components/analysis/BasketballCourtLines.tsx`
- `src/components/analysis/basketball-court-lines.ts`
- `src/components/analysis/CourtPositionsCourt.tsx`
- `src/components/analysis/court-positions-court.ts`
- `src/components/analysis/CourtPositionsHeatmap.tsx`
- `src/components/analysis/court-positions-heatmap.ts`
- `src/components/analysis/ProcessingShotArc.tsx`
- `src/components/analysis/processing-shot-arc.ts`
- `src/services/registry.ts`
- `src/services/contracts/analysis-job-team-sides.service.ts`
- `src/services/api/analysis-job-team-sides.client.ts`
- `src/services/contracts/analysis-job-stats.service.ts`
- `src/services/api/analysis-job-stats.client.ts`
- `src/services/contracts/analysis-job-shot-chart.service.ts`
- `src/services/api/analysis-job-shot-chart.client.ts`
- `src/services/contracts/analysis-job-court-positions.service.ts`
- `src/services/api/analysis-job-court-positions.client.ts`
- `src/services/contracts/analysis-job-similar.service.ts`
- `src/services/api/analysis-job-similar.client.ts`
- `src/services/contracts/analysis.service.ts`
- `src/services/mock/analysis.mock.ts`
- `src/services/contracts/videos.service.ts`
- `src/services/mock/videos.mock.ts`
- `src/services/contracts/teams.service.ts`
- `src/services/contracts/players.service.ts`
- `src/types/index.ts`

## Current Behavior

### Manual-review truthfulness checkpoint

- In real-API mode, manual review never loads or displays seeded mock sessions or legacy mock result details.
- A real manual review persists its ranges as a backend `ClipCollection` and navigates to that collection; it does not fabricate an `AnalysisSession`.
- Mock mode may retain local demo sessions for development, but detected-player presentation never exposes randomly generated analytics.

### Phase 2 global discovery

- Desktop relies on the persistent sidebar for the global `Nuevo análisis` action; `/analisis` keeps the page-level action on smaller viewports and keeps a contextual action in the empty state.
- ProcessingJob status language is consistent across discovery surfaces: `QUEUED` is `En cola`, `RUNNING` is `En proceso`, `DONE` is `Completado`, and `FAILED` is `Fallido`.
- Automatic ProcessingJobs are the primary meaning of Analysis. Legacy `AnalysisSession` records are confined to the secondary `Revisión manual` routes.
- Because the backend has no global jobs endpoint, the frontend composes teams → team videos → jobs per video with bounded concurrency, partial-failure reporting, and a short in-memory session cache.
- The in-memory catalogue cache is owned by the authenticated `user.id`. Logout or an identity change invalidates the previous catalogue generation, and late discovery or polling responses from that generation are ignored rather than becoming visible under the next account.
- The catalogue polls only known `QUEUED` or `RUNNING` jobs through the job detail endpoint. It never repeats the complete discovery graph on each polling interval.
- Analysis identity is human-first: video title and team are primary; dates, duration, state, and real progress are supporting metadata. UUIDs remain in technical Details.
- A dedicated backend endpoint for the authenticated user's global analyses remains the correct long-term replacement for this client-side composition.

- `/analisis/jobs/:jobId?team_id=...` is a dedicated dark analysis workspace organized around persistent source video, one active result surface, and evidence-oriented navigation.
- The result workspace is a shared component used both by the legacy job route and by a completed Partido Reporte. The legacy route retains its existing header, loading/error/polling states, five-module navigation, and exact job identity.
- Stats and Shot Chart loading live in one small controller owned by the shared result workspace. Overview and Shots consume the same server result; Overview never depends on a hidden mounted Shots surface.
- The workspace header uses video title, team, status, analysis date, and optional duration as its primary identity. The job UUID is confined to Details.
- The embedded source player resolves a fresh team-scoped playback URL, keeps loading/error/retry states local, exposes a stable seek capability, and preserves playback time when refreshing an expired or failed signed URL where the browser permits it.
- The source player remains mounted while switching Overview, Shots, Movement, Similar, and Details. Result panels remain mounted but only the active panel is visible, preserving local filters and selections.
- QUEUED and RUNNING render inside the same workspace and both remain live through the existing team-scoped polling endpoint. Polling stops only at DONE or FAILED, and a transition to DONE exposes results without a page reload.
- A transient polling failure preserves the last successful job snapshot and
  displays a connection-loss notice while scheduled retries continue. The
  notice clears on the next successful poll; the UI never presents stale
  progress as if it were still verified live.
- Overview contains only server-backed status, timestamps, detected shooting totals/coverage, and navigation actions. It does not generate qualitative or AI-authored conclusions.
- Shots combines headline shooting metrics, local result/points/player/zone filters, the existing court visualization, and an individual-moment list from the returned shot payloads.
- Selecting a shot marker or moment preserves that shot as selected. A shot with `timestampSeconds` seeks the persistent source player; a shot without it remains inspectable but never exposes a fake video action.
- Shot evidence copy explicitly treats linked timestamps as detected moments and does not claim contractual synchronization with the original video timeline.
- Movement remains spatial analysis only. It reuses trajectories and heatmap views, supports existing side/track filters, and never converts `frameIndex` to time or seeks video.
- Similar analyses hydrate recognizable video titles through one team-scoped video-list request and gracefully fall back to a secondary job identifier when metadata is unavailable.
- Team-side confirmation remains persisted before Stats or Shot Chart can load. The existing jersey, track-count, roster-match, and suggestion data remain the only evidence claimed by the selector.
- Details contains execution identifiers, timestamps, coverage/invalid-sample diagnostics made available by loaded modules, and explicit methodology limitations.
- FAILED remains a safe product state with source context and recovery navigation. Raw backend failure strings are not promoted as primary copy and no unsupported same-job retry is offered.
- Phase 1.1 keeps the persistent source video and result-module architecture while flattening non-essential cards, using Spanish module labels, and treating court geometry, jersey identity, shot location, and spatial sequence as the workspace's visual language.
- A playable source video retains the full primary player surface. A failed source video collapses to a compact degraded state with video identity, retry, and an explicit evidence limitation instead of reserving an empty aspect-ratio rectangle.
- Completed workspace navigation uses `Resumen`, `Tiros`, `Movimiento`, `Similares`, and `Detalles`. Its mobile presentation is a keyboard-accessible horizontal module rail with hidden native scrollbar, snap targets, and edge cues rather than visible accidental overflow.
- Shots presents its compact metrics and filters before a desktop master-detail composition where the shot court and selected-shot evidence are visible together. Marker and evidence selection remain one shared state.
- Mobile Shots exposes one focused selected-shot detail below the court and never introduces a nested vertical evidence scroller. Unselected moments remain available through a flat, page-scrolling list only when the user asks to browse them.
- Movement defaults to one concrete player/track, preferring a track on the persisted team side when one exists. `Comparar todos` and detected-side groupings remain secondary spatial comparison modes.
- The selected Movement player exposes `Reproducir recorrido`, pause, restart, and a sequence scrubber powered by Motion for React. Progress represents ordered sample sequence only: it never derives seconds from `frameIndex`, seeks the source video, or claims synchronized replay.
- Reduced-motion users receive the complete static selected-player trajectory and retain the player/view controls without automatic or spatial playback motion.
- Movement trajectory and heatmap surfaces share a richer full basketball-court geometry with baselines, half court, centre circle, painted areas, backboards, hoops, and three-point geometry.
- Similar analyses present unchanged backend scores as high-contrast comparison rows/bars, not nested score cards. Technical identifiers remain tertiary.
- In the Partido `match-report` presentation, Movement uses compact exclusive Recorrido / Mapa de calor controls, the existing single player-or-group filter, flat real metrics, and a dominant dark court. Playback remains an ordered-sample animation with reduced-motion support and never becomes video or real-time synchronization.
- In the Partido `match-report` presentation, Similar analyses use an editorial divided list: general similarity is the primary neutral figure, shot and movement similarity stay secondary, hydrated title/date remain conditional, and each row keeps the exact legacy job route. Scores are never described as probability, confidence, quality, or precision.
- Model v2 player identity uses `stable_player_id` as the logical key whenever the backend provides it; v1 results continue to use `track_id` without changing their behavior.
- Stats preserve v2 `observations` and `on_court`. The frontend treats `on_court` only as a backend ranking derived from total observations; it never presents the flag as a current lineup, a chronological state, or synchronized presence. Those players may be prioritized where a list is ordered, while every returned player remains available.
- Shot filters, selected-shot fallback identity, court marker labels, Movement selection, trajectory grouping, playback reset identity, colours, and React keys prefer the stable identity and fall back to the legacy track identity.
- Visible player labels continue to prefer roster name and confirmed jersey number. Raw stable ids remain internal; when v2 has no human identity the UI uses a neutral detected-player label rather than exposing the identifier.
- The backend already groups v2 Court Positions paths by stable player before the frontend receives them. The frontend preserves that grouping and does not regroup or recalculate movement metrics.
- Team-side remains a side-level contract based on backend-provided track counts, numbers, and roster matches. The frontend does not reinterpret those counts as stable-player counts.
- Known backend issue: v2 confirmed jersey numbers may be keyed by `stable_player_id` while team-side still consumes track-keyed numbers. As a result, `numbers`, `roster_matches`, or `suggested_team_side` may be incomplete; the frontend renders the endpoint response and does not infer or patch mappings the contract did not return.
- Similar-analysis scoring explicitly excludes player identity, so stable ids do not alter its request, ordering, or presentation.

- The secondary `/revision-manual` list loads legacy sessions through `analysisService.listSessions()` and does not hydrate every row with detail requests.
- Manual work remains a single scannable list under human `Revisión manual` language; it is not the primary meaning of Analysis.
- Legacy rows use only reliable `AnalysisSession` fields and preserve their existing detail routes without being mixed into the automatic catalogue.
- A real `RUNNING` processing-job detail with a numeric `progressPercent` supplements the existing accessible percentage and progress bar with a decorative shot arc. Ball position and visible trajectory are derived only from that real percentage, never from synthetic phases or autonomous looping; reduced-motion users receive the corresponding static frame.
- Analysis list distinguishes loading, retryable error, successful empty, and successful populated states.
- Manual clip creation uses progressive disclosure inside `/revision-manual/nuevo`; `/analisis/nuevo` now starts an automatic ProcessingJob from a ready video.
- Setup first asks which material the user wants to analyze and offers an existing video or a new local file.
- The workspace, timeline, clip editor, roster, and `Guardar análisis` action are not rendered during Setup.
- Existing videos are not considered ready until `videoService.getById()` resolves a usable playback URL and the browser can read its media metadata.
- Failed existing-video hydration remains an explicit recoverable Setup error and never enters the workspace.
- Existing videos infer their associated team and suggest their video title as the analysis title.
- New files display their filename, human-readable size, and validation state before exposing the required team selection.
- New-file validation requires a non-empty video file whose media metadata can be read; no arbitrary size limit is invented.
- Players and roster are not requested during Setup.
- Rival, date, context, and analysis-title editing remain optional after the material is selected.
- Date and free-form context remain local to the active flow because current persistence contracts do not represent them.
- When no teams exist, Setup opens a small inline create-team dialog and returns to the same selected material after creation.
- Team creation uses the existing service contract and the same inferred short name/default country behavior as the current Teams page.
- A new file is uploaded through `videoService.upload()` before the workspace is shown.
- Uploading is represented as indeterminate activity without fabricated percentage or ETA.
- Upload failure preserves file, team, and optional context and exposes a retry action.
- After a successful upload, Setup clearly states that the video exists in Videos while the analysis is not yet saved.
- Ready Setup shows the prepared video, inferred team/title, optional context, and `Empezar análisis`.
- Entering the workspace preserves the prepared Setup model and local playback URL.
- Workspace exposes `Editar preparación`; returning to Setup does not re-upload a prepared video.
- When clips already exist, Setup keeps the prepared material locked while allowing title and optional context edits.
- The post-Setup workspace uses a scoped dark focus theme; Setup and every other route retain the normal light shell.
- Desktop workspace navigation starts as a compact rail and can be expanded. Leaving the workspace resets the rail and theme.
- `Guardar análisis` is visible only inside the workspace.
- The video player is the dominant workspace surface, with its single-track timeline directly below it and contextual actions in a secondary panel.
- The initial workspace has no fabricated range or active clip form and guides the user to reproduce the video and mark a play.
- Marking a start creates an incomplete selection; the clip label editor appears only after a later, valid end is marked.
- The timeline remains the primary range interaction. Numeric start/end fields are secondary and collapsed by default.
- Clip label is the only required clip metadata. Player association and a short note are optional, collapsed tertiary context.
- `Guardar clip` stages the current valid range in the local clip library and becomes the primary contextual action.
- The compact clip library makes playback the primary action and places draft edit/delete actions in an overflow menu.
- Draft edits are explicitly presented as local. The current backend exposes no persisted-clip update operation, so the UI does not claim durable editing after analysis persistence.
- Workspace save state distinguishes unsaved, saving, saved, and partial failure. Successful save remains visibly acknowledged before detail navigation.
- For a newly uploaded video, the workspace distinguishes `video subido` from `análisis sin guardar`.
- New analysis page previews the selected video locally before upload.
- New analysis page supports selecting a video through the file picker or by dragging a video file onto the upload area.
- New analysis page lets the user stage clips by marking a range on a single-track video timeline and assigning a label.
- New analysis page rejects zero-duration clips: the end time must be greater than the start time.
- New analysis page generates a lightweight thumbnail strip locally from the selected video; thumbnails are not uploaded or persisted.
- Clicking the timeline seeks the video, while dragging either range handle updates the clip start or end time.
- Timeline range handles support keyboard adjustment and keep the range inside the video duration without allowing the handles to cross.
- Start and end fields remain available for precise manual adjustments and stay synchronized with the visual range.
- New analysis page shows the current video position, selected range, and range duration on the timeline before the clip is saved.
- New analysis page can attach optional related players and a brief local note without making either part of the core marking flow.
- Staged clips can be clicked to seek the video to the clip start; playback pauses when it reaches the clip end when autoplay succeeds.
- Manual clips remain local to the page until `Guardar análisis` is pressed.
- Manual clip ranges are limited to 30 seconds so they satisfy the persisted clip contract.
- Setup uploads a new video once before workspace entry; `Guardar análisis` does not upload it again.
- For an existing video, the workspace reuses that video without an upload.
- `Guardar análisis` creates a collection on the prepared video and persists all clip ranges atomically through `clipCollectionService.addClips()`.
- Manual labels remain in the analysis model because collection items only persist range and position data.
- After collection persistence, `Guardar análisis` calls mock `analysisService.saveManualAnalysis()` so the existing analysis detail keeps its labels and detected-event demo data.
- Player association remains optional; empty `playerIds` is valid and the existing persistence boundary stays available for future extension.
- Saved manual analysis stores the generated collection id and links to the persisted collection detail.
- The mock save creates an analysis session and game events from staged clips so the existing detail page can show the saved labels as detected events.
- The mock save stores snapshots of the selected local and visitor teams before creating the synthetic match, so detail rendering works when teams came from the backend service instead of the mock store.
- Optional visitor team remains empty when the user does not select one; the mock does not invent a rival team for manual analyses.
- Review reads `id` from the existing detail route.
- Review first tries `analysisService.getBySessionId(id)`.
- If no session detail is found, it tries to resolve the id as a video id through `videoService.getById(id)` and then loads analysis by match id.
- Review distinguishes loading, retryable request error, and not-found states.
- Review uses the manual analysis name, match title, video title, or session code in that reliability order instead of a generic page title.
- Review preserves pending, processing, and completed as distinct domain states and never labels a completed session as processing.
- Processing review emphasizes its current progress and remaining time. Completed review removes processing metrics from the primary hierarchy.
- The primary review surface is the playable video plus one contextual moments list: saved clips when they exist, otherwise detected events.
- Saved clips with reliable ranges can seek and stop the video. Events without reliable numeric range metadata remain read-only.
- When the video is unavailable, Review shows a compact notice and promotes the moments list instead of reserving the dominant surface for a large placeholder.
- Match/video metadata and detected players remain available through secondary disclosure.
- Detected-player review shows reliable name, jersey number, position, and count but suppresses the randomly generated mock heatmap percentage.
- Collection navigation remains a secondary action and appears only when a saved manual analysis has a `clipCollectionId`.
- Review does not expose `Editar análisis`: the current route and persistence state cannot safely restore a saved analysis into the local Workspace.
- Review remains in the normal light application shell; only the active analysis Workspace uses the dark focus theme.
- A running processing job in a video's real history exposes `Ver progreso`, while a completed job exposes `Ver análisis`; both link to the same team-scoped job detail route. Queued and failed jobs do not expose this navigation.
- User-facing processing-job detail copy uses product language: `Análisis de video`, `Estadísticas de tiro detectadas`, `Mapa de tiros`, `plantel`, `sistema`, `seguimientos`, and `Grupo detectado A/B`. Internal endpoint, type, and side `0 | 1` contracts remain unchanged.
- Job detail loads `analysisJobService.get(jobId, teamId)` directly from route/query parameters and never creates an `AnalysisSession` or requires a match.
- While the loaded job remains `RUNNING`, its detail polls that same team-scoped endpoint every 10 seconds without overlapping requests. Each response replaces the job snapshot so real progress and terminal `DONE` or `FAILED` transitions render immediately; polling stops on a terminal response or when the route unmounts or changes.
- After loading the job, video and team services resolve optional display context from the job's own `videoId` and `teamId`. Context lookup failures fall back to identifiers without hiding the job.
- Job detail reuses the Phase 6E review hierarchy and UI primitives for loading, retryable error, not-found, status, progress, completion, and secondary metadata.
- A direct refresh works when `jobId` and `team_id` remain in the URL. Missing parameters or a backend 404 render the not-found state.
- Completed job detail does not request the raw `/jobs/{jobId}/results` payload; real shooting stats use their dedicated endpoint and presentation boundary.
- Completed job detail loads the pipeline's detected sides through `GET /jobs/{jobId}/team-sides?team_id=...`; non-completed jobs do not request team-side data.
- Side 0 and side 1 expose only backend-provided track counts, detected jersey numbers, and roster-match counts. The UI does not infer player identities.
- `suggested_team_side` preselects a side visually but remains explicitly unconfirmed until the user submits it.
- `our_team_side` is the persisted selection. It is displayed as confirmed and can be changed by selecting the other side and submitting again.
- A persisted team side is initially summarized as `Tu equipo: Grupo detectado A/B`; `Cambiar` expands the existing selector, and confirming or cancelling returns to the compact summary without changing the service contract.
- Team-side loading and confirmation errors stay local to the selector. A failed confirmation preserves the visible selection and the loaded job detail.
- Completed job detail requests shooting statistics only after `our_team_side` is confirmed. It never requests stats for a non-completed job or an unconfirmed side.
- Shooting stats load through `GET /jobs/{jobId}/stats?team_id=...` and remain independent from the team-side service and component.
- Changing the persisted team side updates the detail's `ProcessingJob`; the stats request key includes that persisted side, so the box score reloads with the backend's new roster mapping.
- The shooting presentation includes only backend-provided team and player totals for points, field goals, two-pointers, three-pointers, percentages, and available zone breakdowns.
- Player identity uses `roster_name` when linked and otherwise the backend's `display_name`; missing jersey and roster fields are never synthesized.
- Coverage is shown separately and states both partial detection counts and `not_measured` categories without rendering fake values for rebounds, assists, turnovers, steals, fouls, or minutes.
- Stats distinguish loading, retryable error, empty output, partial coverage, and the prerequisite to confirm a team side.
- Completed job detail requests the shot chart only after `our_team_side` is confirmed. Shot chart loading remains independent from shooting stats and team-side persistence.
- Shot chart loads through `GET /jobs/{jobId}/shot-chart?team_id=...` without per-player requests; player filtering uses the full response locally.
- Changing the persisted team side remounts and reloads the shot-chart block so no player association from the previous side remains visible.
- The court uses backend-provided metre dimensions as its SVG view box and converts each valid `x_m` / `y_m` position to responsive percentages. Invalid or out-of-court coordinates are never rendered.
- The shared court drawing interprets `corner_three_lateral_m` in the backend's FIBA coordinate frame as the lateral distance from the width centre line. For the current 28 m × 15 m contract, `6.60` therefore places the straight three-point lines at `y=0.90` and `y=14.10`, joined to the backend-provided 6.75 m arcs around the hoops.
- Three-point geometry is presentation-only. It does not move shot markers or recalculate their backend-provided `points`, `zone`, distance, result, or statistics.
- Made, missed, and unknown shots use three separate marker and text treatments; unknown is never labelled or styled as a miss.
- Shot-chart coverage reports charted shots, shots without a valid court position, and shots without an identified shooter. Empty, loading, retryable error, partial, and unconfirmed-team states are distinct.
- Completed job detail loads Court Positions through `GET /jobs/{jobId}/court-positions?team_id=...&sample_every=...` independently from team-side, Stats, and Shot Chart.
- Court Positions requires only a `DONE` job. Confirming or changing `our_team_side` never changes its request key and never refetches position data; a confirmed side is used only to highlight tracks already labelled by the backend.
- The service owns the visualization sampling value. Movement distance, sample count, and average position are rendered exactly as returned and are never recalculated from the sampled path.
- Court Positions draws responsive paths using the backend's court dimensions and real `x_m` / `y_m` values. It does not fabricate timestamps.
- The Court Positions block also exposes a local `Trayectorias` / `Mapa de calor` view switch. `Trayectorias` remains the initial view, both views share the same track/side filter, and changing either control never triggers another request.
- The heatmap derives only from valid samples already present in `players[].positions[]`. It groups them into approximately 1 m × 1 m cells and normalizes each cell against the highest sample count in the active filter.
- Heatmap intensity represents relative concentration of the received spatial samples. It does not represent seconds in a zone, percentage of time, possession, exact temporal occupancy, or reconstructed values from `movement.samples`; maps produced with different filters do not share an absolute scale.
- The heatmap keeps the backend court dimensions, boundary and half-court line, reports the number of valid samples used, and preserves truncated and off-court coverage notices. Visible tracks with no valid positions render a dedicated heatmap empty state.
- Tracks use a confirmed jersey number when present and otherwise the technical label `Seguimiento {track_id}`. Movement labels may use a roster name already present in the successful Stats response for the exact current job (matched by stable/track key; duplicate keys are ignored); otherwise they fall back to the jersey number. No player name or roster identity is invented.
- The local selector supports all tracks, side 0, side 1, and one individual track without additional requests. Tracks without a mapped team side are excluded from Movement entirely (`Todos`, heatmap, comparison, and selector), so there is no `Sin asignar` option.
- Loading, retryable error, empty output, truncated coverage, discarded off-court records, and a local filter with no matching tracks are distinct states.
- A completed job loads `Análisis similares` through `GET /jobs/{jobId}/similar?team_id=...&limit=5&movement_weight=0.5` after the Court Positions block. Non-completed jobs do not request this endpoint.
- Similar analyses are other completed processing jobs from the same team. The block preserves the backend result order, renders at most five results, and labels `score`, `shot_score`, and `movement_score` as similarity scores rather than accuracy, probability, or confidence.
- Similar analyses have local loading, retryable error, empty, and populated states. A failure, including a deployed-backend `404`, does not hide or break the rest of the job detail and has no mock fallback.
- Each similar-analysis result links to `/analisis/jobs/{jobId}?team_id=...` with the current team id. The UI does not synthesize names, dates, opponents, thumbnails, recommendations, or qualitative similarity levels from the returned identifiers and scores.
- Similar-analysis loading depends only on the completed job id and team id. It is independent from `our_team_side`, Shooting Stats, Shot Chart, Court Positions, and Heatmap.
- The completed status is represented once in the detail header/status indicator rather than repeated in a separate completion card. Secondary execution information is collapsed by default.
- The shared results workspace supports a match-report presentation without changing the legacy `/analisis/jobs/:jobId` presentation. The match presentation redesign is limited to the report index, team-side decision, Resumen, and Tiros; Movimiento and Similares retain their existing surfaces in R3-B1.
- Match Resumen and Tiros consume the same Stats and Shot Chart controller. The editorial field-goal sentence, court markers, coverage, filters, and selected-shot detail are all derived from those existing responses without new calculations beyond the percentages already exposed by the frontend.
- In the match presentation, selecting a shot synchronizes the court and list without opening video. `Ver jugada` remains gated by a real non-negative `timestampSeconds` and is the only action that reveals the persistent source player and performs the existing direct seek/play behavior.
- Module failures keep their existing local retry boundary but render brief product-facing messages instead of raw backend responses such as `Not Found`.
- Shooting totals are explicitly presented as detected metrics rather than an official box score; the qualification appears next to the section heading and coverage remains visible.

## Service Selection

- `analysisService` currently always uses `mockAnalysisService`.
- `videoService` uses the configured video implementation from the registry.
- Analysis session metadata remains mock/local, while its collection and clip ranges use the configured real or mock clip collection service.
- A parallel `IAnalysisJobService` models backend processing jobs without replacing the existing analysis-session service.
- The API implementation exposes `listForVideo(videoId, teamId)` through `GET /videos/{video_id}/jobs?team_id=...` and `get(jobId, teamId)` through `GET /jobs/{job_id}?team_id=...`.
- Processing job statuses remain the backend values `QUEUED`, `RUNNING`, `DONE`, and `FAILED`; nullable `progress_percent` is mapped to `progressPercent`.
- Videos, Inicio, and `/analisis` share a client-composed catalogue built from `listForVideo(videoId, teamId)`; per-video history keeps the same real boundary.
- `/analisis/nuevo` creates a ProcessingJob from a ready video. `/revision-manual`, `/revision-manual/nuevo`, and the compatibility `/analisis/:id` route retain the mock/manual `AnalysisSession` flow.
- The dedicated `analysisJobTeamSideService` reads detected sides and persists side `0 | 1` without extending `AnalysisSession`.
- Team-side confirmation sends `PUT /jobs/{jobId}/our-team?team_id=...` with `{ "team_side": 0 | 1 }` and maps the returned processing job.
- The dedicated `analysisJobStatsService` maps the complete `/stats` response while remaining separate from both `AnalysisSession` and the team-side mutation boundary.
- The dedicated `analysisJobShotChartService` maps court geometry, markers, per-player groups, and coverage without depending on the stats or team-side service contracts.
- The dedicated `analysisJobCourtPositionsService` maps court paths, movement summaries, team-side metadata, and coverage without reading or mutating `our_team_side`.
- Stats map `stable_player_id`, `observations`, `on_court`, and `coverage.players_on_court` when present, defaulting the additive v2 fields safely for older v1 responses.
- Shot Chart maps `stable_player_id` on players and shots plus `filtered_to_stable_player_id`; the workspace keeps its existing one-request local filtering behavior and does not issue a new request per player selection.
- Court Positions maps the optional `stable_player_id`; individual filters use a stable-key value for v2 and a track-key value for v1.
- Player tables, individual shot-chart options, and individual Movement options expose only players with a mapped team side (`0` or `1`) and either a non-empty mapped `rosterPlayerId` or a trimmed jersey number containing exactly one or two digits. Players without a team side are hidden from every player list, table, and selector, and Movement additionally drops them from its aggregate views; the shot map and `Todos` still keep every shot. This visibility rule is centralized in the analysis player-identity helper and never depends on display text, shooting totals, observations, or `on_court`. Because Court Positions does not carry roster linkage, Movement reuses Stats identity by stable/track key without another request, but only while those Stats are successful and belong to the exact current job; duplicate Stats keys are treated as ambiguous and do not contribute roster identity.
- The identified-player visibility rule is presentation-only. API clients retain every returned player, `Todos` keeps every shot and spatial sample, aggregate totals and heatmaps remain unchanged, and an empty identified-player set falls back to the aggregate `all` selection.
- Because aggregate totals still include unattributed and non-identified evidence, their values may be greater than the sum of the visible per-player rows. This is expected and preserves the backend coverage contract.
- The dedicated `analysisJobSimilarService` maps processing-job similarity scores and keeps `limit=5` and `movement_weight=0.5` encapsulated in its request boundary.

## Non-Scope

- There is no real backend `AnalysisSession` API wired in the registry.
- Listing jobs globally is not part of the backend processing-job boundary; Phase 2 therefore composes the catalogue client-side with bounded concurrency, partial results, a short session cache, and active-only polling.
- The new analysis playground is a sprint/demo flow, not the final backend contract.
- Manual-analysis labels are not persisted on backend collection items.
- Persisted collection items cannot currently be updated through the frontend service contract; clip editing is limited to staged local drafts before analysis save.
- Optional per-clip notes are local workspace context and are not represented by the backend clip-range contract.
- Setup date/free-form context is not persisted because the current contracts have no Partido persistence fields.
- Successfully uploaded videos are not rolled back if the user leaves before saving the analysis.
- Restoring or editing a persisted analysis in the Workspace because the current routes and contracts do not provide a reliable rehydration path.
- Player comparison, team comparison, player/team similarity, recommendations, scouting automation, and prompt-driven agents are future scope.
- Raw job results are not loaded by the job-specific detail. The heatmap is derived locally from the already-loaded Court Positions response and has no separate backend contract.

## Verification

- Automated frontend suite: 166/166 tests passing, including the Phase 1.1 result workspace plus global ProcessingJob composition, partial failures, active-only polling, human identity, automatic/manual routing, video/analysis status separation, contextual upload, direct playback, and auth expiry.
- The v2 processing-job workspace has focused coverage for `QUEUED -> RUNNING -> DONE` polling, persistent video placement across result tabs, made/missed/unknown local filters, nullable timestamps, imperative seeking, source URL refresh, and direct known-team video lookup without an all-team fan-out.
- Court Positions adds 11 focused tests for mapping, `0 | 1 | null` sides, jersey/track labels, empty and truncated coverage, retry, local filters, side changes without refetch, 28 × 15 coordinate mapping, and responsive width guards.
- Heatmap adds 10 focused tests for one-metre binning, boundary and invalid coordinates, out-of-court samples, dynamic court dimensions, relative intensity, filter-scoped normalization, empty valid samples, and request reuse across view and filter changes.
- Similar analyses adds 9 focused tests for the fixed request contract, `DONE` gating, mapping, backend order, five-result display limit, score labels, empty state, retry, team-scoped navigation, side independence, and placement after Court Positions.
- `npm run build`: passing; Vite keeps the known chunk-size warning.
- `npm run lint`: 0 errors and the 2 preexisting Fast Refresh warnings in `button.tsx` and `AuthContext.tsx`.
- A controlled mobile smoke test verified the completed workspace at `/analisis/jobs/job-qa?team_id=team-3`, including the compact identity header, persistent video recovery state, Overview metrics, shot filters and evidence actions, movement presentation, similar-analysis empty state, and technical Details.
- Phase 1.1 visual QA covered the completed workspace at 1440 × 900 and 390 × 844, including Overview, Shots master-detail and selection, Movement before/during sequence playback, heatmap, Similar, compact source-video failure, and mobile module discovery. The dedicated local fixture copy uses basketball-oriented team, venue, and match labels; no backend data was changed.
- Real job `f504888a-978a-4f43-a130-280e730c5a04` was verified through `QUEUED → RUNNING → DONE` with working polling.
- Phase 2 visual smoke used the mock teams/videos plus a controlled local ProcessingJob service with `DONE`, `RUNNING`, and `FAILED` states. A separate controlled 401 verified refresh failure, token invalidation, and redirect to Login without a connection alert. Full real-backend upload-to-results smoke remains dependent on authenticated backend services and a processable video fixture.

- Run `npm run build`.
- Run `npm run lint`.
- Inspect Setup and workspace at desktop and approximately 390px widths.
- Verify existing-video hydration failure cannot enter the workspace.
- Verify new-file validation, no-team creation, indeterminate upload, retry, ready, and edit-Setup flows.
- Verify clips survive context editing and lock material changes once clip work exists.
- Verify initial guidance, start-only state, selected-range editor, staged clip playback, local edit, and confirmed removal.
- Verify unsaved, saving, visible saved acknowledgement, and partial-failure presentations without changing service payloads.
- Verify Setup is light, Workspace is dark, returning to Setup restores light mode, and navigating elsewhere restores the full normal shell.
- Verify the analysis list performs one list request without per-row detail hydration.
- Verify list loading, retryable error, empty, pending, processing, and completed presentations.
- Verify Review loading, request error, not-found, processing, completed, playable-video, unavailable-video, clips, and event-only presentations.
- Verify detected players never expose the random mock heatmap percentage.
- Inspect the Analysis list and Review at desktop and approximately 390px widths.
