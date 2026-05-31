# Analysis Current Spec

## Status

Current behavior documentation.

## Routes

- `/analisis`: analysis sessions list.
- `/analisis/:id`: analysis detail page.

## Files Involved

- `src/pages/analysis/AnalysisPage.tsx`
- `src/pages/analysis/AnalysisDetailPage.tsx`
- `src/services/registry.ts`
- `src/services/contracts/analysis.service.ts`
- `src/services/mock/analysis.mock.ts`
- `src/services/contracts/videos.service.ts`
- `src/services/mock/videos.mock.ts`
- `src/types/index.ts`

## Current Behavior

- Analysis list loads sessions through `analysisService.listSessions()`.
- Each session displays session code, status, progress, frame count, and a detail link.
- Detail page reads `id` from the route.
- Detail page first tries `analysisService.getBySessionId(id)`.
- If no session detail is found, it tries to resolve the id as a video id through `videoService.getById(id)` and then loads analysis by match id.
- Detail page displays a loading message while no detail is available.
- Detail page displays session progress, video preview placeholder, match/video information, detected players, and detected events.
- Events render labels and metadata such as quarter, minute, player number, and XP when present.

## Service Selection

- `analysisService` currently always uses `mockAnalysisService`.
- `videoService` currently always uses `mockVideoService`.

## Non-Scope

- There is no real backend analysis API wired in the registry.
- Video playback is represented by a visual placeholder.
- Export button is displayed but no export implementation is documented here.
- No new analysis features are requested here.

## Verification

- Run `npm run build`.
- Run `npm run lint`.
- Manually verify analysis list and detail loading with mock data.
