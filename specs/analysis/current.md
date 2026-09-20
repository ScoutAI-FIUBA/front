# Analysis Current Spec

El estado operativo del working tree y el próximo punto de continuación están registrados en [`handoff.md`](./handoff.md).

## Status

Implemented behavior through Phase 6E Analysis list and Review redesign.

## Routes

- `/analisis`: analysis sessions list.
- `/analisis/nuevo`: manual analysis playground for demo use.
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
- `src/pages/analysis/analysis-job-detail.ts`
- `src/pages/analysis/AnalysisJobTeamSide.tsx`
- `src/pages/analysis/analysis-job-team-side.ts`
- `src/pages/analysis/AnalysisJobShootingStats.tsx`
- `src/pages/analysis/analysis-job-stats.ts`
- `src/pages/analysis/AnalysisJobShotChart.tsx`
- `src/pages/analysis/analysis-job-shot-chart.ts`
- `src/pages/analysis/AnalysisJobCourtPositions.tsx`
- `src/pages/analysis/analysis-job-court-positions.ts`
- `src/components/analysis/ShotChartCourt.tsx`
- `src/components/analysis/shot-chart-court.ts`
- `src/components/analysis/CourtPositionsCourt.tsx`
- `src/components/analysis/court-positions-court.ts`
- `src/components/analysis/CourtPositionsHeatmap.tsx`
- `src/components/analysis/court-positions-heatmap.ts`
- `src/services/registry.ts`
- `src/services/contracts/analysis-job-team-sides.service.ts`
- `src/services/api/analysis-job-team-sides.client.ts`
- `src/services/contracts/analysis-job-stats.service.ts`
- `src/services/api/analysis-job-stats.client.ts`
- `src/services/contracts/analysis-job-shot-chart.service.ts`
- `src/services/api/analysis-job-shot-chart.client.ts`
- `src/services/contracts/analysis-job-court-positions.service.ts`
- `src/services/api/analysis-job-court-positions.client.ts`
- `src/services/contracts/analysis.service.ts`
- `src/services/mock/analysis.mock.ts`
- `src/services/contracts/videos.service.ts`
- `src/services/mock/videos.mock.ts`
- `src/services/contracts/teams.service.ts`
- `src/services/contracts/players.service.ts`
- `src/types/index.ts`

## Current Behavior

- Analysis list loads sessions through a single `analysisService.listSessions()` request and does not hydrate every row with detail requests.
- Analysis list exposes an `Empezar análisis` action that keeps the global creation language consistent.
- Analysis list is a single scannable work list rather than a grid of equally weighted cards.
- Each row uses only reliable `AnalysisSession` fields: session code, pending/processing/completed status, and state-relevant progress metadata.
- Completed rows omit the redundant 100% progress bar and lead to review; processing rows expose progress and remaining time; pending rows do not fabricate progress detail.
- Analysis list distinguishes loading, retryable error, successful empty, and successful populated states.
- New analysis uses progressive disclosure inside the existing `/analisis/nuevo` route.
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
- A completed processing job in a video's real history exposes `Ver análisis` and links to the job-specific detail route. Other job statuses do not expose this navigation.
- Job detail loads `analysisJobService.get(jobId, teamId)` directly from route/query parameters and never creates an `AnalysisSession` or requires a match.
- After loading the job, video and team services resolve optional display context from the job's own `videoId` and `teamId`. Context lookup failures fall back to identifiers without hiding the job.
- Job detail reuses the Phase 6E review hierarchy and UI primitives for loading, retryable error, not-found, status, progress, completion, and secondary metadata.
- A direct refresh works when `jobId` and `team_id` remain in the URL. Missing parameters or a backend 404 render the not-found state.
- Completed job detail does not request the raw `/jobs/{jobId}/results` payload; real shooting stats use their dedicated endpoint and presentation boundary.
- Completed job detail loads the pipeline's detected sides through `GET /jobs/{jobId}/team-sides?team_id=...`; non-completed jobs do not request team-side data.
- Side 0 and side 1 expose only backend-provided track counts, detected jersey numbers, and roster-match counts. The UI does not infer player identities.
- `suggested_team_side` preselects a side visually but remains explicitly unconfirmed until the user submits it.
- `our_team_side` is the persisted selection. It is displayed as confirmed and can be changed by selecting the other side and submitting again.
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
- Tracks use a confirmed jersey number when present and otherwise the technical label `Track {track_id}`. No player name or roster identity is invented.
- The local selector supports all tracks, side 0, side 1, tracks without a side, and one individual track without additional requests.
- Loading, retryable error, empty output, truncated coverage, discarded off-court records, and a local filter with no matching tracks are distinct states.

## Service Selection

- `analysisService` currently always uses `mockAnalysisService`.
- `videoService` uses the configured video implementation from the registry.
- Analysis session metadata remains mock/local, while its collection and clip ranges use the configured real or mock clip collection service.
- A parallel `IAnalysisJobService` models backend processing jobs without replacing the existing analysis-session service.
- The API implementation exposes `listForVideo(videoId, teamId)` through `GET /videos/{video_id}/jobs?team_id=...` and `get(jobId, teamId)` through `GET /jobs/{job_id}?team_id=...`.
- Processing job statuses remain the backend values `QUEUED`, `RUNNING`, `DONE`, and `FAILED`; nullable `progress_percent` is mapped to `progressPercent`.
- The Videos page consumes only `listForVideo(videoId, teamId)` inside a per-video history disclosure; the global Analysis pages remain on `AnalysisSession` and the mock `analysisService`.
- The job-specific detail consumes `get(jobId, teamId)` while `/analisis`, `/analisis/nuevo`, and `/analisis/:id` remain on the existing mock/session flow.
- The dedicated `analysisJobTeamSideService` reads detected sides and persists side `0 | 1` without extending `AnalysisSession`.
- Team-side confirmation sends `PUT /jobs/{jobId}/our-team?team_id=...` with `{ "team_side": 0 | 1 }` and maps the returned processing job.
- The dedicated `analysisJobStatsService` maps the complete `/stats` response while remaining separate from both `AnalysisSession` and the team-side mutation boundary.
- The dedicated `analysisJobShotChartService` maps court geometry, markers, per-player groups, and coverage without depending on the stats or team-side service contracts.
- The dedicated `analysisJobCourtPositionsService` maps court paths, movement summaries, team-side metadata, and coverage without reading or mutating `our_team_side`.

## Non-Scope

- There is no real backend `AnalysisSession` API wired in the registry.
- Listing jobs globally is not part of the current processing-job boundary.
- The new analysis playground is a sprint/demo flow, not the final backend contract.
- Manual-analysis labels are not persisted on backend collection items.
- Persisted collection items cannot currently be updated through the frontend service contract; clip editing is limited to staged local drafts before analysis save.
- Optional per-clip notes are local workspace context and are not represented by the backend clip-range contract.
- Setup date/free-form context is not persisted because the current contracts have no Partido persistence fields.
- Successfully uploaded videos are not rolled back if the user leaves before saving the analysis.
- Restoring or editing a persisted analysis in the Workspace because the current routes and contracts do not provide a reliable rehydration path.
- Similar-play search, movement visualizations, and prompt-driven agents are future scope.
- Job results and similar-play data are not loaded by the job-specific detail. The heatmap is derived locally from the already-loaded Court Positions response and has no separate backend contract.

## Verification

- Automated frontend suite: 85/85 tests passing, including side `0`, side `1`, side changes, Shooting Stats, Shot Chart, Court Positions, Heatmap, gating and request keys that prevent stale data or unnecessary refetches.
- Court Positions adds 11 focused tests for mapping, `0 | 1 | null` sides, jersey/track labels, empty and truncated coverage, retry, local filters, side changes without refetch, 28 × 15 coordinate mapping, and responsive width guards.
- Heatmap adds 10 focused tests for one-metre binning, boundary and invalid coordinates, out-of-court samples, dynamic court dimensions, relative intensity, filter-scoped normalization, empty valid samples, and request reuse across view and filter changes.
- `npm run build`: passing; Vite keeps the known chunk-size warning.
- `npm run lint`: 0 errors and the 2 preexisting Fast Refresh warnings in `button.tsx` and `AuthContext.tsx`.
- Real job `f504888a-978a-4f43-a130-280e730c5a04` was verified through `QUEUED → RUNNING → DONE` with working polling.
- The remaining real smoke test for team-side, Stats and Shot Chart is blocked only by the deployed backend being behind `origin/main`: the deployed API returns `404 {"detail":"Not Found"}` for `GET /jobs/{job_id}/team-sides`, while the route exists in the current backend contract and the frontend request matches it.
- Production behavior must not add fallback mocks or synthetic results to hide that deployment mismatch.

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
