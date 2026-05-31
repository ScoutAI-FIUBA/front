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
- Upload page loads teams and matches.
- Upload page collects title, date, team, match, rival/opponent, and a local selected file name.
- Upload requires title, team, and match.
- Successful upload navigates back to `/videos`.
- Toasts provide success and error feedback.

## Service Selection

- `videoService` currently always uses `mockVideoService`.
- `matchService` currently always uses `mockMatchService`.
- Team data comes from `teamService`, which can be API or mock depending on `VITE_USE_MOCK_API`.

## Non-Scope

- No real file upload backend integration is documented here.
- Date is collected on the upload page but the required fields are title, team, and match.
- No new video features are requested here.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify video filtering, request analysis, and upload form with mocks available.
