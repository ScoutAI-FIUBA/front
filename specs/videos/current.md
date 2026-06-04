# Videos Current Spec

## Status

Current behavior documentation.

## Routes

- `/videos`: videos list and filtering.
- `/videos/subir`: video upload form.

## Files Involved

- `src/pages/videos/VideosPage.tsx`
- `src/pages/videos/VideoUploadPage.tsx`
- `src/services/registry.ts`
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
- `matchService` currently always uses `mockMatchService`.
- Team data comes from `teamService`, which can be API or mock depending on `VITE_USE_MOCK_API`.

## Backend Alignment Notes

- The backend exposes authenticated `/videos` endpoints for multipart upload initialization, completion, abort, listing, retrieval, update, and delete.
- `apiVideoService.upload` initializes multipart upload, uploads file chunks to presigned part URLs, and completes the upload with returned ETags.
- Backend statuses are mapped to frontend statuses: `READY -> uploaded`, `PENDING_UPLOAD -> processing`, `FAILED -> failed`.
- `requestAnalysis(videoId)` has no backend counterpart and remains mock-only.

## Non-Scope

- No backend analysis request integration is implemented here.
- Matches remain mocked and are no longer required by the video upload form.
- No new video features are requested here.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify video filtering, request analysis, and upload form with mocks available.
