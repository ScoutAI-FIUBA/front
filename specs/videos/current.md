# Videos Current Spec

## Status

Current behavior documentation.

## Routes

- `/videos`: videos list and filtering.
- `/videos/subir`: video upload form.

## Files Involved

- `src/pages/videos/VideosPage.tsx`
- `src/pages/videos/videos-page-data.ts`
- `src/pages/videos/video-team-navigation.ts`
- `src/pages/videos/video-responsive.ts`
- `src/pages/videos/VideoAnalysisJobs.tsx`
- `src/pages/videos/VideoPlaybackDialog.tsx`
- `src/pages/videos/video-playback.ts`
- `src/pages/videos/analysis-job-presentation.ts`
- `src/pages/videos/VideoUploadPage.tsx`
- `src/services/registry.ts`
- `src/services/contracts/analysis-jobs.service.ts`
- `src/services/api/analysis-jobs.api.ts`
- `src/services/contracts/videos.service.ts`
- `src/services/api/videos.api.ts`
- `src/services/mock/videos.mock.ts`
- `src/services/contracts/teams.service.ts`
- `src/services/contracts/matches.service.ts`
- `src/services/contracts/analysis.service.ts`
- `src/types/index.ts`
- `src/lib/utils.ts`

## Current Behavior

- Videos page loads videos and teams as the real primary dataset. Mock recent activity is requested and rendered only when `VITE_USE_MOCK_API=true`; API mode does not display synthetic activity and does not invent a replacement endpoint.
- The primary Videos + Teams load distinguishes loading, retryable error, successful empty, filtered empty, and populated states. A failed request never masquerades as an empty video list.
- Videos can be filtered by team and status.
- `/videos?team_id={teamId}` preselects the existing local team filter when the
  id belongs to a loaded team. Missing or invalid ids safely show all teams.
- Changing the team selector updates `team_id` in the URL, and selecting
  `Todos los equipos` removes it. This does not add backend requests.
- Each video row can disclose its own backend processing-job history without navigating to the global analysis list.
- Ready videos expose a `Ver video` action. Opening it requests fresh detail
  through `videoService.getById`, then shows the returned playback URL in a
  local dialog with loading, retry, unavailable, and close states. Playback
  failures do not replace or clear the Videos list.
- Desktop keeps the scannable video table, while narrow viewports render each video as a responsive card with its title, team, optional description, date, status, collections, and processing-job history action available without horizontal clipping.
- The processing-job history is the single visible entry point from Videos into completed analysis results. The legacy `/analisis/:id` route remains available internally but its ambiguous icon-only link is not rendered in the primary Videos experience.
- Ready videos expose an `Iniciar análisis` action inside that history disclosure. It submits `POST /videos/{video_id}/jobs` with `{ team_id }`; the optional pipeline is omitted so the backend selects its default.
- A successful submission inserts the returned `QUEUED` job into the existing history immediately. The active-job polling lifecycle then starts without converting the job to an `AnalysisSession`.
- Analysis submission is single-flight: the action is disabled while its request is pending, and an existing `QUEUED` or `RUNNING` job also disables another submission in line with the backend's one-active-job constraint.
- When that active job is `RUNNING`, the top action becomes `Ver progreso`
  and reuses the same team-scoped detail path as the job row. A `QUEUED` job
  keeps the non-navigable `Análisis en curso` state.
- Submission errors are shown inside the history disclosure without clearing the last successfully loaded jobs.
- Opening a video's analysis history loads `analysisJobService.listForVideo(videoId, teamId)` once; users can retry failures or refresh the history manually.
- While an open history contains at least one `QUEUED` or `RUNNING` job, it refreshes the complete per-video snapshot every 10 seconds through `listForVideo`. The next timer is scheduled only after the current request settles, so polling requests never overlap.
- Polling stops when every returned job is `DONE` or `FAILED`, and its timer is cleaned up when the history panel closes or unmounts. Poll failures preserve the last successful snapshot and retry on the next interval.
- Video job history distinguishes loading, retryable error, empty, and populated states.
- Job rows render the backend statuses `QUEUED`, `RUNNING`, `DONE`, and `FAILED` directly. Running jobs show `progressPercent` only when present and otherwise show indeterminate activity. Failed jobs show a brief product-facing message without exposing the backend `errorMessage`.
- Video statuses displayed include uploaded, processing, and analyzed.
- Uploaded videos can request analysis through `videoService.requestAnalysis(id)`.
- Upload page loads teams.
- Upload page collects title, team, optional description, and a selected video file.
- Upload requires title, team, and file.
- Successful upload navigates back to `/videos`.
- Toasts provide success and error feedback.

## Service Selection

- `videoService` uses `apiVideoService` unless `VITE_USE_MOCK_API=true`.
- `analysisJobService` uses the real backend API implementation and is consumed only by the per-video history disclosure for listing and creating processing jobs.
- `matchService` currently always uses `mockMatchService`.
- Team data comes from `teamService`, which can be API or mock depending on `VITE_USE_MOCK_API`.
- `isMockApiEnabled` exposes the registry's existing environment selection so presentation code can omit mock-only activity in API mode without changing any service contract.

## Backend Alignment Notes

- The backend exposes authenticated `/videos` endpoints for multipart upload initialization, completion, abort, listing, retrieval, update, and delete.
- `apiVideoService.upload` initializes multipart upload, uploads file chunks to presigned part URLs, and completes the upload with returned ETags and known `duration_ms` when supplied by the player.
- Video list responses keep the backend `storage_key` as internal metadata and do not expose it as a browser-playable URL.
- `apiVideoService.getById` retrieves `GET /videos/{video_id}?team_id=...` for uploaded videos and maps `presigned_playback_url` to the frontend `storageUrl` used by the native video player.
- Videos that are not ready are returned from list metadata without requesting a playback URL.
- Backend statuses are mapped to frontend statuses: `READY -> uploaded`, `PENDING_UPLOAD -> processing`, `FAILED -> failed`.
- Only frontend videos mapped to `uploaded` expose real job creation, matching the backend requirement that the video be `READY`.
- Backend `duration_ms` is mapped to `Video.durationMs` for clip-range validation.
- Backend `description` is mapped to `Video.description` and displayed as
  description; the frontend does not reinterpret it as a rival name.
- The legacy `videoService.requestAnalysis(videoId)` remains mock-only and separate from real `analysisJobService.create`.

## Non-Scope

- No global processing-job history, job detail/results, stats, or shot-chart integration is implemented here. Creation and polling exist only inside the per-video history.
- Matches remain mocked and are no longer required by the video upload form.
- Adaptive streaming and transcoding are not implemented; playback uses the original browser-compatible file through a presigned URL.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify video filtering, request analysis, and upload form with mocks available.
- Verify API mode never requests or renders mock recent activity.
- Verify loading, retry, no-video, filtered-empty, card, and table states for the main Videos + Teams load.
