# Videos Current Spec

## Status

Current behavior documentation.

## Routes

- `/videos`: videos list and filtering.
- `/videos/subir`: video upload form.

## Files Involved

- `src/pages/videos/VideosPage.tsx`
- `src/pages/videos/VideoAnalysisJobs.tsx`
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

- Videos page loads videos, teams, and recent activity.
- Videos can be filtered by team and status.
- Each video row can disclose its own backend processing-job history without navigating to the global analysis list.
- Opening a video's analysis history loads `analysisJobService.listForVideo(videoId, teamId)` once; users can retry failures or refresh the history manually.
- While an open history contains at least one `QUEUED` or `RUNNING` job, it refreshes the complete per-video snapshot every 10 seconds through `listForVideo`. The next timer is scheduled only after the current request settles, so polling requests never overlap.
- Polling stops when every returned job is `DONE` or `FAILED`, and its timer is cleaned up when the history panel closes or unmounts. Poll failures preserve the last successful snapshot and retry on the next interval.
- Video job history distinguishes loading, retryable error, empty, and populated states.
- Job rows render the backend statuses `QUEUED`, `RUNNING`, `DONE`, and `FAILED` directly. Running jobs show `progressPercent` only when present and otherwise show indeterminate activity. Failed jobs show the backend `errorMessage` when available.
- Video statuses displayed include uploaded, processing, and analyzed.
- Analyzed videos link to `/analisis/:id` using the video id.
- Uploaded videos can request analysis through `videoService.requestAnalysis(id)`.
- Upload page loads teams.
- Upload page collects title, team, optional description, and a selected video file.
- Upload requires title, team, and file.
- Successful upload navigates back to `/videos`.
- Toasts provide success and error feedback.

## Service Selection

- `videoService` uses `apiVideoService` unless `VITE_USE_MOCK_API=true`.
- `analysisJobService` uses the read-only real backend API implementation and is consumed only by the per-video history disclosure.
- `matchService` currently always uses `mockMatchService`.
- Team data comes from `teamService`, which can be API or mock depending on `VITE_USE_MOCK_API`.

## Backend Alignment Notes

- The backend exposes authenticated `/videos` endpoints for multipart upload initialization, completion, abort, listing, retrieval, update, and delete.
- `apiVideoService.upload` initializes multipart upload, uploads file chunks to presigned part URLs, and completes the upload with returned ETags and known `duration_ms` when supplied by the player.
- Video list responses keep the backend `storage_key` as internal metadata and do not expose it as a browser-playable URL.
- `apiVideoService.getById` retrieves `GET /videos/{video_id}?team_id=...` for uploaded videos and maps `presigned_playback_url` to the frontend `storageUrl` used by the native video player.
- Videos that are not ready are returned from list metadata without requesting a playback URL.
- Backend statuses are mapped to frontend statuses: `READY -> uploaded`, `PENDING_UPLOAD -> processing`, `FAILED -> failed`.
- Backend `duration_ms` is mapped to `Video.durationMs` for clip-range validation.
- `requestAnalysis(videoId)` has no backend counterpart and remains mock-only.

## Non-Scope

- No backend analysis request integration is implemented here.
- No global processing-job history, job creation, job detail/results, stats, or shot-chart integration is implemented here. Polling exists only while an open per-video history has active jobs.
- Matches remain mocked and are no longer required by the video upload form.
- Adaptive streaming and transcoding are not implemented; playback uses the original browser-compatible file through a presigned URL.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify video filtering, request analysis, and upload form with mocks available.
